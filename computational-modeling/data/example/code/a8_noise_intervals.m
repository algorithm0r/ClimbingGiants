% Assignment 8: an uncertainty interval on the driver's HIC15 (MATLAB version).
%
% The same program as a8_noise_intervals.py, written for MATLAB. Run this from
% the unzipped pack folder. It
%   1. measures the noise on the three driver head channels over the 50 ms
%      before impact, including how much each sample resembles its neighbors,
%   2. reruns the whole HIC15 calculation (CFC 1000 filter, resultant, 15 ms
%      window search) 1000 times with noise added, for two noise models:
%        independent: Gaussian noise drawn fresh for each sample, same sigma
%        blocks:      10 ms pieces cut at random from the pre-impact record itself
%   3. gives the 90% and 95% intervals for both,
%   4. changes each judgment call that was held fixed (g and the baseline), one
%      at a time, to see how far it moves HIC15.
% Saves noise_before_impact.svg, noise_autocorrelation.svg and hic_draws.svg.
%
% MATLAB draws different random numbers from Python's, so the intervals come
% out a little different from the Python version's. Everything else is the same.

G = 9.80665;       % standard gravity, m/s^2 in one g
DRAWS = 1000;      % reruns per noise model
BLOCK = 200;       % samples per block for the 'blocks' model (10 ms at 20 kHz)
CODES = {'11HEADCG0000ACXP', '11HEADCG0000ACYP', '11HEADCG0000ACZP'};

files = dir(fullfile('crash', '*.json'));   % the crash folder holds one file
test = jsondecode(fileread(fullfile('crash', files(1).name)));
chans = {};
keys = fieldnames(test.channels);
for m = 1:numel(keys)
    c = test.channels.(keys{m});
    if any(strcmp(c.code, CODES))
        chans{end+1} = c;
    end
end
dt = chans{1}.dt;
n = chans{1}.n;
t0 = chans{1}.t0;
t_ms = 1000 * (t0 + dt * (0:n-1)');
before = t_ms < 0;
raw = cell(1, numel(chans));            % each channel's samples
pre = cell(1, numel(chans));            % the part of each before impact
for m = 1:numel(chans)
    raw{m} = chans{m}.y;
    pre{m} = raw{m}(before);
end

% 1. the noise
fprintf('%d head channels, %d samples every %g ms, %.2f to %.2f ms\n', numel(chans), n, ...
        dt * 1000, t_ms(1), t_ms(end));
t_before = t_ms(before);
fprintf('pre-impact stretch: %d samples, %.2f to %.2f ms\n', sum(before), t_ms(1), t_before(end));
LAGS = [1, 20, 100, 200];
columns = {};
for lag = LAGS
    columns{end+1} = sprintf('r(%g ms)', lag * dt * 1000);
end
fprintf('%-18s %9s %7s %6s %7s   %s\n', 'code', 'prefilter', 'mean', 'sigma', 'sigma', ...
        strjoin(columns, '  '));
for m = 1:numel(chans)
    c = chans{m};
    p = pre{m};
    r = p - mean(p);
    columns = {};
    for lag = LAGS
        columns{end+1} = sprintf('%9.2f', autocorr(r, lag));
    end
    fprintf('%-18s %6s Hz %7.3f %6.3f %6.4fg   %s\n', c.code, c.prefilter_hz, mean(p), ...
            std(p, 1), std(p, 1) / G, strjoin(columns, '  '));
end

% 2. the value, then the reruns
value = pipeline(raw, dt, 1000, 15, G);
fprintf('\nHIC15 on the record: %.2f\n', value);
rng(310);                               % the same random numbers on every run
names = {'independent', 'blocks'};
models = {@independent_noise, @block_noise};   % each one a function
draws = cell(1, 2);
for k = 1:2
    noise = models{k};
    runs = zeros(DRAWS, 1);
    for j = 1:DRAWS
        noisy = cell(1, numel(raw));
        for m = 1:numel(raw)
            noisy{m} = raw{m} + noise(pre{m}, n, BLOCK);
        end
        runs(j) = pipeline(noisy, dt, 1000, 15, G);
    end
    draws{k} = runs;
end

% 3. the intervals
fprintf('\n%-12s %7s %17s %6s %17s %6s\n', 'noise model', 'median', '90% interval', 'width', ...
        '95% interval', 'width');
for k = 1:2
    d = draws{k};
    l90 = percentile(d, 5);
    h90 = percentile(d, 95);
    l95 = percentile(d, 2.5);
    h95 = percentile(d, 97.5);
    fprintf('%-12s %7.2f %8.2f to %6.2f %6.2f %8.2f to %6.2f %6.2f\n', names{k}, median(d), ...
            l90, h90, h90 - l90, l95, h95, h95 - l95);
end

% 4. what was held fixed, changed one at a time
l95 = percentile(draws{2}, 2.5);
h95 = percentile(draws{2}, 97.5);
fprintf('\n%-34s %7s %7s %11s\n', 'held fixed, changed to', 'HIC15', 'shift', 'x 95% width');
change_names = {'g = 9.81', 'pre-impact mean subtracted'};
changes = zeros(1, 2);
changes(1) = pipeline(raw, dt, 1000, 15, 9.81);
corrected = cell(1, numel(raw));
for m = 1:numel(raw)
    corrected{m} = raw{m} - mean(pre{m});
end
changes(2) = pipeline(corrected, dt, 1000, 15, G);
for k = 1:2
    v = changes(k);
    ratio = abs(v - value) / (h95 - l95);
    fprintf('%-34s %7.2f %+7.2f %11.2f\n', change_names{k}, v, v - value, ratio);
end

% Figure 1: the pre-impact stretch of each channel
fig = figure('Position', [100 100 800 600]);
for m = 1:numel(chans)
    subplot(numel(chans), 1, m);
    c = chans{m};
    plot(t_before, pre{m}, 'LineWidth', 0.7);
    title(sprintf('%s  [%s]', c.comment, c.code), 'FontSize', 9);
    ylabel('acceleration (m/s^2)', 'FontSize', 8);
end
xlabel('time from impact (ms)');
saveas(fig, 'noise_before_impact.svg');
close(fig);

% Figure 2: how alike neighboring samples are
lags = 1:500;
fig = figure('Position', [100 100 800 360]);
hold on
for m = 1:numel(chans)
    r = pre{m} - mean(pre{m});
    corr = zeros(size(lags));
    for k = 1:numel(lags)
        corr(k) = autocorr(r, lags(k));
    end
    plot(lags * dt * 1000, corr);
end
xl = xlim;
yl = ylim;
plot(xl, [0 0], 'Color', [0.5 0.5 0.5]);
plot([BLOCK * dt * 1000, BLOCK * dt * 1000], yl, '--', 'Color', [0.5 0.5 0.5]);
title('Autocorrelation of the pre-impact noise (independent noise would sit at 0)');
xlabel('lag (ms)');
ylabel('autocorrelation (no units)');
legend({chans{1}.code, chans{2}.code, chans{3}.code, '', 'block length, 10 ms'}, 'FontSize', 8);
saveas(fig, 'noise_autocorrelation.svg');
close(fig);

% Figure 3: the reruns under both noise models, 95% intervals marked
fig = figure('Position', [100 100 800 380]);
hold on
lowest = min(min(draws{1}), min(draws{2}));
highest = max(max(draws{1}), max(draws{2}));
edges = linspace(lowest, highest, 50);
centers = (edges(1:end-1) + edges(2:end)) / 2;
colors = {[0.12 0.47 0.71], [1 0.5 0.05]};
labels = {};
for k = 1:2
    d = draws{k};
    counts = hist(d, centers);           % how many reruns fall in each bin
    stairs(edges, [counts, counts(end)], 'Color', colors{k}, 'LineWidth', 1.2);
    lo = percentile(d, 2.5);
    hi = percentile(d, 97.5);
    labels{end+1} = sprintf('%s: 95%% interval %.2f to %.2f', names{k}, lo, hi);
end
yl = ylim;
for k = 1:2
    d = draws{k};
    for v = [percentile(d, 2.5), percentile(d, 97.5)]
        plot([v v], yl, '--', 'Color', colors{k});
    end
end
plot([value value], yl, 'k', 'LineWidth', 1.2);
title(sprintf('HIC15 over %d reruns for each noise model', DRAWS));
xlabel('HIC15 (a in g, t in s)');
ylabel('number of reruns');
legend([labels, {'', '', '', '', sprintf('value on the record, %.2f', value)}], 'FontSize', 8);
saveas(fig, 'hic_draws.svg');
close(fig);


function out = cfc(y, dt, cls)
    % SAE J211-1 four-pole Butterworth (Smoothing notes), forward then backward.
    wd = 2 * pi * cls * 2.0775;
    wa = tan(wd * dt / 2);
    d = 1 + sqrt(2) * wa + wa^2;
    a0 = wa^2 / d;
    b1 = -2 * (wa^2 - 1) / d;
    b2 = (-1 + sqrt(2) * wa - wa^2) / d;
    c = [a0, b1, b2];
    forward = one_pass(y, c);
    backward = one_pass(flip(forward), c);
    out = flip(backward);
end


function out = one_pass(x, c)
    a0 = c(1);
    b1 = c(2);
    b2 = c(3);
    out = zeros(size(x));
    for i = 3:numel(x)
        out(i) = a0 * x(i) + 2 * a0 * x(i-1) + a0 * x(i-2) ...
                 + b1 * out(i-1) + b2 * out(i-2);
    end
end


function best = hic(a, dt, limit_ms)
    % Largest HIC over every window up to limit_ms, a = resultant in g.
    % Prefix sum of the trapezoid integral, one pass per window length.
    panels = (a(2:end) + a(1:end-1)) / 2 * dt;
    S = [0; cumsum(panels)];
    kmax = round(limit_ms / 1000 / dt);         % the limit in samples
    best = 0;
    for k = 1:kmax
        T = k * dt;
        mean_a = max((S(k+1:end) - S(1:end-k)) / T, 0);   % every window of length k at once
        best = max(best, max(T * mean_a.^2.5));
    end
end


function v = pipeline(chs, dt, cls, limit_ms, g)
    % The whole analysis: filter each component, resultant in g, HIC search.
    % An empty cls skips the filter.
    if ~isempty(cls)
        for m = 1:numel(chs)
            chs{m} = cfc(chs{m}, dt, cls);
        end
    end
    total = 0;
    for m = 1:numel(chs)
        total = total + chs{m}.^2;
    end
    v = hic(sqrt(total) / g, dt, limit_ms);
end


function c = autocorr(r, lag)
    % Correlation between the noise and itself shifted by lag samples.
    cc = corrcoef(r(1:end-lag), r(1+lag:end));
    c = cc(1, 2);
end


function noise = independent_noise(pre, n, block)
    % Gaussian noise with the pre-impact record's sigma. block is not used.
    noise = std(pre, 1) * randn(n, 1);
end


function noise = block_noise(pre, n, block)
    % Join random 10 ms pieces of the (mean-removed) pre-impact record.
    r = pre - mean(pre);
    pieces = [];
    for k = 1:floor(n / block) + 1
        s = randi(numel(r) - block + 1);        % a random start, counted from 1
        pieces = [pieces; r(s:s + block - 1)];
    end
    noise = pieces(1:n);
end


function p = percentile(d, q)
    % The q-th percentile, found the way numpy's np.percentile does by default:
    % sort, then go a fraction q/100 of the way from the first value to the last,
    % reading between two values on a straight line.
    d = sort(d);
    pos = (numel(d) - 1) * q / 100 + 1;
    lo = floor(pos);
    hi = min(lo + 1, numel(d));
    p = d(lo) + (pos - lo) * (d(hi) - d(lo));
end
