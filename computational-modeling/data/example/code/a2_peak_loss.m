% Assignment 2: peak loss at lower sample rates, every channel of the test (MATLAB version).
%
% The same program as a2_peak_loss.py, written for MATLAB. Run this from the
% unzipped pack folder. A record at a lower rate is made from the recorded one by
% keeping every k-th sample. Which sample the slower logger starts on is not
% known, so every start from 0 to k-1 is tried and the lowest peak (the worst
% start) and highest peak (the best start) are both kept.
%
% Prints the full-rate peak of each channel, the worst-start peak at each rate, and
% the lowest rate at which every channel keeps 95% of its peak. Saves
% fraction_vs_rate.svg (Figure 1) and crossmember_1khz.svg (Figure 2).

G = 9.81;                % m/s^2 in one g
KEEP = 0.95;             % a rate passes if every channel keeps 95% of its peak
PROPOSED = 1000;         % Hz, the logger purchasing wants

files = dir(fullfile('crash', '*.json'));   % the crash folder holds one test file
test = jsondecode(fileread(fullfile('crash', files(1).name)));
channels = test.channels;
keys = fieldnames(channels);

rate_now = round(1 / channels.head_x.dt);
full_rate = sprintf('%g kHz', rate_now / 1000);   % the recorded rate, for labels
% every whole-number step down from the recorded rate, to a hundredth of it
factors = [];
for k = 1:100
    if mod(rate_now, k) == 0           % k divides the rate exactly
        factors(end+1) = k;
    end
end
rates = rate_now ./ factors;

v = test.vehicle;
info = test.test;
fprintf('Test %d: %d %s %s, %s at %g km/h\n', test.testNo, v.year, v.make, v.model, ...
        info.config, info.speed_kph);
timings = {};            % each different combination, kept once by unique below
for m = 1:numel(keys)
    ch = channels.(keys{m});
    timings{end+1} = sprintf('(%d, %g, ''%s'')', ch.n, ch.dt, ch.prefilter_hz);
end
fprintf('samples, spacing (s) and prefilter (Hz) of each channel: {%s}\n', ...
        strjoin(unique(timings), ', '));
fprintf('recorded rate %d Hz, %d rates tried, %d to %d Hz\n', rate_now, numel(rates), ...
        rates(1), rates(end));
fprintf('\n');

% the full-rate peak of every channel, and when it happens
fprintf('%-12s %-34s %8s %-4s %8s\n', 'key', 'description', 'peak', 'unit', 'at (ms)');
for m = 1:numel(keys)
    key = keys{m};
    ch = channels.(key);
    [y, unit] = values(channels, key, G);
    i = 1;                               % index of the largest size so far
    for j = 1:numel(y)
        if abs(y(j)) > abs(y(i))
            i = j;
        end
    end
    t_ms = 1000 * (ch.t0 + (i - 1) * ch.dt);
    fprintf('%-12s %-34s %8.2f %-4s %8.2f\n', key, ch.comment, peak(y), unit, t_ms);
end

% worst-start peak at each rate, as a fraction of the full-rate peak
worst = struct();
for m = 1:numel(keys)
    key = keys{m};
    [y, unit] = values(channels, key, G);
    full = peak(y);
    worst.(key) = zeros(1, numel(factors));
    for f = 1:numel(factors)
        worst.(key)(f) = min(peaks_by_start(y, factors(f))) / full;
    end
end

fprintf('\nworst-start peak as %% of the %s peak\n', full_rate);
fprintf('%9s %s\n', 'rate (Hz)', strjoin(cellfun(@(key) sprintf('%11s', key), keys', ...
        'UniformOutput', false), ' '));
for i = 1:numel(rates)
    row = sprintf('%9d', rates(i));
    for m = 1:numel(keys)
        row = [row, sprintf(' %11.1f', 100 * worst.(keys{m})(i))];
    end
    disp(row);
end

% the lowest rate that every channel passes, with every faster rate passing too
lowest = rate_now;
for i = 1:numel(rates)
    failing = {};
    for m = 1:numel(keys)
        if worst.(keys{m})(i) < KEEP
            failing{end+1} = keys{m};
        end
    end
    if isempty(failing)
        lowest = rates(i);
    else
        fprintf('\n%d Hz is the first rate to fail: %s\n', rates(i), strjoin(failing, ', '));
        break
    end
end
fprintf('Lowest rate keeping %.0f%% of every peak: %d Hz\n', 100 * KEEP, lowest);

% the proposed rate, worst and best start, in the channel's own units
k = floor(rate_now / PROPOSED);         % floor, as Python's // does
fprintf('\nAt %g Hz (every %dth sample), range of peaks over the %d starts:\n', rate_now / k, k, k);
for m = 1:numel(keys)
    key = keys{m};
    [y, unit] = values(channels, key, G);
    p = peaks_by_start(y, k);
    fprintf('  %-12s %s %7.2f   worst %7.2f (%5.1f%%)   best %7.2f   start 0 %7.2f %s\n', ...
            key, full_rate, peak(y), min(p), 100 * min(p) / peak(y), max(p), p(1), unit);
end

% Figure 1: worst-start fraction against rate, one line per channel
fig = figure('Position', [100 100 750 450]);
labels = {};
for m = 1:numel(keys)
    semilogx(rates, 100 * worst.(keys{m}), '.-');
    hold on
    labels{end+1} = title_case(channels.(keys{m}).comment);
end
xl = xlim;                           % a line across at 95% and one up at 1000 Hz
yl = ylim;
plot(xl, [100 * KEEP, 100 * KEEP], ':k');
plot([PROPOSED, PROPOSED], yl, 'r');
xlim(xl);
ylim(yl);
labels = [labels, {'95% of the peak', 'proposed logger, 1000 Hz'}];
xticks([200, 500, 1000, 2000, 5000, 10000, 20000]);
xticklabels({'200', '500', '1000', '2000', '5000', '10000', '20000'});
xlabel('sample rate (Hz, log scale)');
ylabel(sprintf('worst-start peak (%% of the %s peak)', full_rate));
title(sprintf('Peak kept at each rate, worst start, test %d', test.testNo), 'FontSize', 10);
legend(labels, 'FontSize', 7, 'Location', 'southeast');
saveas(fig, 'fraction_vs_rate.svg');
close(fig);

% Figure 2: the crossmember around its peak, and what a 1 kHz logger keeps of it
ch = channels.vehicle_x;
[y, unit] = values(channels, 'vehicle_x', G);
t_ms = zeros(ch.n, 1);
for i = 1:ch.n
    t_ms(i) = 1000 * (ch.t0 + (i - 1) * ch.dt);
end
p = peaks_by_start(y, k);
[~, b] = max(p);                     % the position of the largest, counted from 1
best_start = b - 1;                  % starts are counted from 0, as in the Python
[~, w] = min(p);
worst_start = w - 1;
fig = figure('Position', [100 100 750 400]);
win = [];                            % the samples from 40 to 70 ms
for i = 1:ch.n
    if 40 <= t_ms(i) && t_ms(i) <= 70
        win(end+1) = i;
    end
end
plot(t_ms(win), y(win), 'Color', [0.5 0.5 0.5], 'LineWidth', 0.8);
hold on
plot_kept(best_start, 'o', win, t_ms, y, k);
plot_kept(worst_start, 's', win, t_ms, y, k);
xlabel('time from impact (ms)');
ylabel('acceleration (g)');
title([title_case(ch.comment) ' [' ch.code '], 40 to 70 ms'], 'FontSize', 10);
legend({sprintf('recorded at %d Hz', rate_now), ...
        sprintf('%g Hz, best start (sample %d)', rate_now / k, best_start), ...
        sprintf('%g Hz, worst start (sample %d)', rate_now / k, worst_start)}, 'FontSize', 8);
saveas(fig, 'crossmember_1khz.svg');
close(fig);


function [out, unit] = values(channels, key, G)
    % The channel in g, or in mm for the chest displacement.
    % Its header says m, but the values are micrometers (see Errors).
    y = channels.(key).y;
    out = zeros(size(y));
    if strcmp(key, 'chest_d')
        for i = 1:numel(y)
            out(i) = y(i) / 1000;
        end
        unit = 'mm';
        return
    end
    for i = 1:numel(y)
        out(i) = y(i) / G;
    end
    unit = 'g';
end


function biggest = peak(y)
    % The largest size in y, ignoring sign.
    biggest = abs(y(1));
    for i = 1:numel(y)
        if abs(y(i)) > biggest
            biggest = abs(y(i));
        end
    end
end


function peaks = peaks_by_start(y, k)
    % Peak of the record that keeps every k-th sample, for each start 0..k-1.
    peaks = zeros(1, k);
    for start = 0:k-1
        peaks(start + 1) = peak(y(start + 1:k:end));
    end
end


function plot_kept(start, mark, win, t_ms, y, k)
    % The samples in the window that a logger starting at sample start keeps.
    kept = [];
    for i = win
        if mod((i - 1) - start, k) == 0      % i - 1 is the sample counted from 0
            kept(end+1) = i;
        end
    end
    plot(t_ms(kept), y(kept), [mark '-']);
end


function s = title_case(s)
    % Capital first letter on each word, the rest lower case, like Python's .title().
    s = lower(s);
    starts = [1, find(~isletter(s(1:end-1))) + 1];
    s(starts) = upper(s(starts));
end
