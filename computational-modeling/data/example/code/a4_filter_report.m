% Assignment 4: peak crossmember acceleration filtered to SAE J211-1 (MATLAB version).
%
% The same program as a4_filter_report.py, written for MATLAB. Run this from the
% unzipped pack folder. It finds the crossmember channel, checks the filter,
% filters the channel at every class J211 defines, and prints the numbers in the
% report. It saves three figures:
%   fig_raw.svg      the whole record, as recorded and at CFC 60
%   fig_classes.svg  the main pulse at each filter class
%   fig_onepass.svg  CFC 60 run once and run forward and backward

G = 9.80665;         % standard gravity, m/s^2
CLASSES = [1000, 600, 180, 60];
PACK = '.';

files = dir(fullfile(PACK, 'crash', '*.json'));
test = jsondecode(fileread(fullfile(PACK, 'crash', files(1).name)));

% the channel whose header comment names the crossmember
key = '';
keys = fieldnames(test.channels);
for m = 1:numel(keys)
    if ~isempty(strfind(test.channels.(keys{m}).comment, 'CROSSMEMBER'))
        key = keys{m};
        break
    end
end
ch = test.channels.(key);
dt = ch.dt;
t = 1000 * (ch.t0 + dt * (0:ch.n-1)');      % ms
raw = ch.y;
fprintf('channel ''%s'': %s [%s]\n', key, ch.comment, ch.code);
fprintf('  %s, %s, %s, status %s, prefilter %s Hz\n', ch.location, ch.direction, ch.unit, ...
        ch.status, ch.prefilter_hz);
fprintf('  %d samples, %.0f samples/s, %.0f to %.0f ms\n', ch.n, 1 / dt, t(1), t(end));
fprintf('  test speed %g km/h = %.2f m/s\n', test.test.speed_kph, test.test.speed_kph / 3.6);

% how wide is the unfiltered peak? count the samples around it above half its size
[~, i] = max(abs(raw));
lo = i;
hi = i;
while abs(raw(lo - 1)) > abs(raw(i)) / 2
    lo = lo - 1;
end
while abs(raw(hi + 1)) > abs(raw(i)) / 2
    hi = hi + 1;
end
fprintf('  unfiltered peak %.1f m/s^2 at %.2f ms, above half that from %.2f to %.2f ms (%d samples)\n', ...
        raw(i), t(i), t(lo), t(hi), hi - lo + 1);
window = (t > 45) & (t < 60);             % true for the samples between 45 and 60 ms
first = find(t > 45, 1);                  % the index of the first sample after 45 ms
[~, jw] = max(raw(window));
j = jw + first - 1;                       % the window's largest value, as an index into raw
fprintf('  largest positive value between 45 and 60 ms: %.1f m/s^2 at %.2f ms\n', raw(j), t(j));

fprintf('\nchecks\n');
for cls = CLASSES
    c = cfc_coefficients(cls, dt);
    fprintf('  CFC %4d: gain on a constant %.12f, needs more than %.0f samples/s\n', cls, ...
            (c(1) + c(2) + c(3)) / (1 - c(4) - c(5)), 4.155 * cls);
end
y60 = cfc(raw, dt, 60, false);
[p60, tp60] = peak(t, y60);
[p, tp] = peak(t, cfc(raw, dt, 60, true));
fprintf('  start from first sample instead of zero: %.2f m/s^2 at %.2f ms\n', p, tp);
offset = mean(raw(t < 0));
[p, tp] = peak(t, cfc(raw - offset, dt, 60, false));
fprintf('  pre-impact mean %.3f m/s^2 removed first: %.2f m/s^2 at %.2f ms\n', offset, p, tp);
fprintf('  in g: %.3f with g = %g, %.3f with g = 9.81\n', p60 / G, G, p60 / 9.81);

fprintf('\nresult at CFC 60, forward and backward\n');
fprintf('  peak %.2f m/s^2 = %.2f g at %.2f ms\n', p60, p60 / G, tp60);
fprintf('  the unfiltered peak is %.2f times this\n', min(raw) / p60);

fprintf('\nevery class\n');
fprintf('  %-12s %11s %8s %7s %12s\n', 'filter', 'peak m/s^2', 'peak g', 'at ms', 'delta-v m/s');
labels = {'as recorded'};
filtered = {raw};
for cls = CLASSES
    labels{end+1} = sprintf('CFC %d', cls);
    filtered{end+1} = cfc(raw, dt, cls, false);
end
for m = 1:numel(labels)
    y = filtered{m};
    [p, tp] = peak(t, y);
    dv = sum((y(2:end) + y(1:end-1)) / 2) * dt;    % trapezoid rule, whole record
    fprintf('  %-12s %11.1f %8.1f %7.2f %12.3f\n', labels{m}, p, p / G, tp, dv);
end

one = one_pass(raw, cfc_coefficients(60, dt), 0);
[p1, tp1] = peak(t, one);
fprintf('\nCFC 60 forward pass only: %.2f m/s^2 = %.2f g at %.2f ms (%+.2f ms)\n', ...
        p1, p1 / G, tp1, tp1 - tp60);

% Figure 1: the whole record
fig = figure('Position', [100 100 800 360]);
plot(t, raw / G, 'Color', [0.83 0.83 0.83], 'LineWidth', 0.7);
hold on
plot(t, y60 / G, 'LineWidth', 1.4);
plot(tp60, p60 / G, 'ko', 'MarkerSize', 4);
text(tp60 + 2, p60 / G, sprintf('%.1f g at %.1f ms', p60 / G, tp60), 'FontSize', 8);
xlabel('time from impact (ms)');
ylabel('X acceleration (g)');
title(sprintf('Left rear seat crossmember [%s], test %d', ch.code, test.testNo), 'FontSize', 10);
legend({'as recorded', 'CFC 60, forward and backward'}, 'Location', 'southeast', 'FontSize', 8);
saveas(fig, 'fig_raw.svg');
close(fig);

% Figure 2: the main pulse at every class
fig = figure('Position', [100 100 800 360]);
hold on
for m = 1:numel(labels)
    if strcmp(labels{m}, 'as recorded')
        plot(t, filtered{m} / G, 'Color', [0.83 0.83 0.83], 'LineWidth', 0.7);
    else
        plot(t, filtered{m} / G, 'LineWidth', 1.1);
    end
end
xlim([40 80]);
xlabel('time from impact (ms)');
ylabel('X acceleration (g)');
title('Crossmember X acceleration at each J211 filter class, 40 to 80 ms', 'FontSize', 10);
legend(labels, 'Location', 'southeast', 'FontSize', 8);
saveas(fig, 'fig_classes.svg');
close(fig);

% Figure 3: one pass against two
fig = figure('Position', [100 100 800 360]);
plot(t, raw / G, 'Color', [0.83 0.83 0.83], 'LineWidth', 0.7);
hold on
plot(t, one / G, 'LineWidth', 1.2);
plot(t, y60 / G, 'LineWidth', 1.2);
xline(tp60, ':', 'Color', [1 0.5 0.05]);
xline(tp1, ':', 'Color', [0.12 0.47 0.71]);
xlim([30 90]);
ylim([-80 30]);
xlabel('time from impact (ms)');
ylabel('X acceleration (g)');
title(sprintf('CFC 60 run once peaks %.2f ms late (dotted lines mark the peaks)', tp1 - tp60), ...
      'FontSize', 10);
legend({'as recorded', 'CFC 60, forward pass only', 'CFC 60, forward and backward'}, ...
       'Location', 'southeast', 'FontSize', 8);
saveas(fig, 'fig_onepass.svg');
close(fig);


function c = cfc_coefficients(cls, dt)
    % SAE J211-1 coefficients, as given in the course notes (Smoothing).
    wd = 2 * pi * cls * 2.0775;
    wa = tan(wd * dt / 2);
    d = 1 + sqrt(2) * wa + wa^2;
    a0 = wa^2 / d;
    b1 = -2 * (wa^2 - 1) / d;
    b2 = (-1 + sqrt(2) * wa - wa^2) / d;
    c = [a0, 2 * a0, a0, b1, b2];
end


function out = one_pass(x, c, start)
    % One pass in the direction of increasing index. start is what the two
    % outputs before the first sample are taken to be.
    out = zeros(size(x));
    out(1) = start;
    out(2) = start;
    for i = 3:numel(x)
        out(i) = c(1) * x(i) + c(2) * x(i-1) + c(3) * x(i-2) ...
                 + c(4) * out(i-1) + c(5) * out(i-2);
    end
end


function out = cfc(y, dt, cls, start_at_data)
    % Forward, then backward over the forward result. With start_at_data the
    % filter starts from the first sample instead of from zero.
    c = cfc_coefficients(cls, dt);
    start = 0;
    if start_at_data
        start = y(1);
    end
    fwd = flip(one_pass(y, c, start));      % forward, then reversed
    start = 0;
    if start_at_data
        start = fwd(1);
    end
    back = one_pass(fwd, c, start);         % forward again over the reversed record
    out = flip(back);
end


function [value, at] = peak(t, y)
    [~, i] = max(abs(y));
    value = y(i);
    at = t(i);
end
