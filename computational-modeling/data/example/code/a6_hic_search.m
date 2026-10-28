% Assignment 6: HIC for the driver's head, and what the search costs (MATLAB version).
%
% The same program as a6_hic_search.py, written for MATLAB. Run it from the
% unzipped pack folder. It:
%   1. reads the three driver head channels by code and filters each at CFC 1000,
%   2. forms the resultant in g,
%   3. finds the best window for every window length with a prefix sum,
%      one pass over the whole record per length, which gives HIC15 and the
%      limit-free value,
%   4. counts and times the windows, and counts what direct integration would cost,
%   5. runs three checks (a plain double loop, no filter, baseline removed).
% Figures saved: head_components.svg, hic_windows.svg, hic_vs_limit.svg
%
% MATLAB counts from 1 and Python from 0, so a window that Python reports as
% samples i to j is samples i+1 to j+1 here. The times it prints are the same.

G = 9.80665;            % standard gravity (m/s^2)
CODES = {'11HEADCG0000ACXP', '11HEADCG0000ACYP', '11HEADCG0000ACZP'};
LIMIT_MS = 15;          % FMVSS 208

% ---- read and filter
tic;
files = dir(fullfile('crash', '*.json'));
test = jsondecode(fileread(fullfile('crash', files(1).name)));
names = fieldnames(test.channels);
chans = {};
for k = 1:numel(CODES)                   % the three channels, found by code
    for m = 1:numel(names)
        c = test.channels.(names{m});
        if strcmp(c.code, CODES{k})
            chans{k} = c;
        end
    end
end
dt = chans{1}.dt;
n = chans{1}.n;
t = (chans{1}.t0 + dt * (0:n-1)') * 1000;          % ms
raw = {};
filt = {};
for k = 1:3
    raw{k} = chans{k}.y;
    filt{k} = cfc(raw{k}, dt, 1000);
end
res = resultant_g(filt, G);
t_read = toc;
fprintf('test %d, %d samples at dt = %.2f ms (%.0f per second), %.0f to %.0f ms\n', ...
        test.testNo, n, dt * 1000, 1 / dt, t(1), t(end));
for k = 1:3
    c = chans{k};
    fprintf('  %s  %s  %s  raw peak %5.1f g  CFC 1000 peak %5.1f g\n', c.code, c.unit, ...
            c.status, max(abs(raw{k})) / G, max(abs(filt{k})) / G);
end
[~, p] = max(res);
fprintf('resultant: peak %.2f g at %.2f ms, mean before impact %.3f g\n', ...
        res(p), t(p), mean(res(t < 0)));
% the filter starts each pass from zero, so look at the ends of the record
raw_res = resultant_g(raw, G);
for back = [10, 4, 2, 0]                 % Python's t[-11], t[-5], t[-3], t[-1]
    i = numel(t) - back;
    fprintf('  at %.2f ms: unfiltered %.2f g, CFC 1000 %.2f g\n', t(i), raw_res(i), res(i));
end
fprintf('read and filter: %.3f s\n', t_read);

% ---- HIC for each limit, and with no limit
fprintf('%8s %7s %10s %8s %7s %7s %11s %9s\n', 'limit', 'HIC', 'from (ms)', 'to (ms)', ...
        'length', 'mean g', 'windows', 'time (s)');
limits = {LIMIT_MS, []};                 % [] stands for no limit
found = cell(1, 2);
for k = 1:2
    lim = limits{k};
    if isempty(lim)
        kmax = n - 1;
        label = 'none';
    else
        kmax = round(lim / 1000 / dt);
        label = sprintf('%d ms', lim);
    end
    tic;
    [h, i, j, w] = hic(res, dt, kmax);
    secs = toc;
    found{k} = [h, i, j, w, secs];
    mean_g = (h / ((j - i) * dt))^(1 / 2.5);
    fprintf('%8s %7.1f %10.2f %8.2f %7.2f %7.1f %11s %9.3f\n', label, h, t(i), t(j), ...
            (j - i) * dt * 1000, mean_g, with_commas(w), secs);
end

% ---- what the search costs
kmax = round(15 / 1000 / dt);
% integrating directly: one addition per sample, for every window
direct = 0;
for k = 1:kmax
    direct = direct + k * (n - k);
end
h15 = found{1}(1);
i15 = found{1}(2);
j15 = found{1}(3);
w15 = found{1}(4);
s15 = found{1}(5);
fprintf('HIC15 windows: %s subtractions with the prefix sum, %s additions integrating each window directly (%.0f times as many)\n', ...
        with_commas(w15), with_commas(direct), direct / w15);
w_all = found{2}(4);
fprintf('no limit: %s windows, %.1f times as many\n', with_commas(w_all), w_all / w15);
per_test = t_read + s15;
fprintf('one test: %.2f s (read and filter %.2f s, search %.3f s), 200 tests: %.0f s\n', ...
        per_test, t_read, s15, 200 * per_test);

% ---- checks
tic;
value = hic_loops(res, dt, kmax);
fprintf('check, plain double loop: HIC15 = %.1f in %.2f s\n', value, toc);
[h, ~, ~, ~] = hic(resultant_g(raw, G), dt, kmax);
fprintf('check, no filter: HIC15 = %.1f\n', h);
before = t < 0;
debiased = {};
for k = 1:3
    debiased{k} = filt{k} - mean(filt{k}(before));
end
[h, ~, ~, ~] = hic(resultant_g(debiased, G), dt, kmax);
fprintf('check, each component''s mean before impact removed: HIC15 = %.1f\n', h);

% ---- figure 1: the three filtered components
fig = figure('Position', [100 100 800 400]);
hold on
labels = {};
for k = 1:3
    c = chans{k};
    plot(t, filt{k} / G, 'LineWidth', 0.8);
    labels{k} = sprintf('%s, %s', c.code(end-1), lower(c.direction));
end
xlabel('time from impact (ms)');
ylabel('head acceleration, CFC 1000 (g)');
title(sprintf('Test %d, driver head CG, components at CFC 1000', test.testNo));
legend(labels);
saveas(fig, 'head_components.svg');
close(fig);

% ---- figure 2: the resultant with the HIC15 window
fig = figure('Position', [100 100 800 400]);
hold on
top = max(62, 1.35 * max(res));     % room for the legend above the trace
patch([t(i15) t(j15) t(j15) t(i15)], [0 0 top top], [1 0.5 0], 'FaceAlpha', 0.4, ...
      'EdgeColor', 'none');
plot(t, res, 'k', 'LineWidth', 0.8);
xlim([0 160]);
ylim([0 top]);
xlabel('time from impact (ms)');
ylabel('resultant head acceleration (g)');
title(sprintf('Test %d, driver head resultant and the best window', test.testNo));
legend({sprintf('HIC15 = %.1f, %.2f to %.2f ms', h15, t(i15), t(j15)), ...
        'resultant, CFC 1000'}, 'Location', 'northwest');
saveas(fig, 'hic_windows.svg');
close(fig);

% ---- figure 3: HIC against the window length limit
[best, ~, ~] = best_by_length(res, dt, round(80 / 1000 / dt));
limit_ms = (1:numel(best)) * dt * 1000;
fig = figure('Position', [100 100 800 400]);
hold on
plot(limit_ms, cummax(best), 'k');
xline(LIMIT_MS, '--', 'Color', [0.5 0.5 0.5]);
text(LIMIT_MS, h15, sprintf('  HIC15 = %.1f', h15));
hn = found{2}(1);
inn = found{2}(2);
jn = found{2}(3);
plot((jn - inn) * dt * 1000, hn, 'o', 'Color', [0.84 0.15 0.16]);
xlabel('longest window allowed (ms)');
ylabel('HIC (a in g, t in s)');
title(sprintf('Test %d, driver HIC against the window length limit', test.testNo));
legend({'best HIC within the limit', '', sprintf('no limit: %.1f over %.2f ms', hn, ...
        (jn - inn) * dt * 1000)}, 'Location', 'southeast');
saveas(fig, 'hic_vs_limit.svg');
close(fig);


function out = cfc(y, dt, cls)
    % SAE J211-1 Butterworth (Smoothing notes), run forward then backward.
    wd = 2 * pi * cls * 2.0775;
    wa = tan(wd * dt / 2);
    d = 1 + sqrt(2) * wa + wa^2;
    a0 = wa^2 / d;
    a1 = 2 * a0;
    a2 = a0;
    b1 = -2 * (wa^2 - 1) / d;
    b2 = (-1 + sqrt(2) * wa - wa^2) / d;
    c = [a0, a1, a2, b1, b2];
    forward = one_pass(y, c);
    backward = one_pass(flip(forward), c);
    out = flip(backward);
end


function out = one_pass(x, c)
    out = zeros(size(x));
    for i = 3:numel(x)
        out(i) = c(1) * x(i) + c(2) * x(i - 1) + c(3) * x(i - 2) ...
                 + c(4) * out(i - 1) + c(5) * out(i - 2);
    end
end


function r = resultant_g(comps, G)
    total = 0;
    for k = 1:numel(comps)
        total = total + comps{k}.^2;
    end
    r = sqrt(total) / G;
end


function [best, start, windows] = best_by_length(a, dt, kmax)
    % For each window length k = 1..kmax samples, the best HIC over every
    % start. The prefix sum S makes each window's integral one subtraction.
    panels = (a(2:end) + a(1:end-1)) / 2 * dt;
    S = [0; cumsum(panels)];
    best = zeros(kmax, 1);
    start = zeros(kmax, 1);
    windows = 0;
    for k = 1:kmax
        T = k * dt;
        mean_a = (S(k+1:end) - S(1:end-k)) / T;   % every window of length k at once
        h = T * max(mean_a, 0).^2.5;
        [best(k), start(k)] = max(h);
        windows = windows + numel(h);
    end
end


function [value, i, j, windows] = hic(a, dt, kmax)
    % HIC with windows up to kmax samples: the value, its first and last sample,
    % and how many windows were looked at.
    [best, start, windows] = best_by_length(a, dt, kmax);
    [value, k] = max(best);
    i = start(k);
    j = start(k) + k;
end


function best = hic_loops(a, dt, kmax)
    % The same search as two plain loops, as a check on the version above.
    S = zeros(numel(a), 1);
    for i = 2:numel(a)
        S(i) = S(i - 1) + (a(i) + a(i - 1)) / 2 * dt;
    end
    best = 0.0;
    for i = 1:numel(a) - 1
        last = min(i + kmax, numel(a));
        for j = i + 1:last
            mean_a = (S(j) - S(i)) / ((j - i) * dt);
            if mean_a > 0
                best = max(best, (j - i) * dt * mean_a^2.5);
            end
        end
    end
end


function s = with_commas(n)
    % A whole number written with commas between thousands, as Python's {n:,} does.
    s = regexprep(sprintf('%d', n), '(\d)(?=(\d{3})+$)', '$1,');
end
