% Assignment 9: benchmarking the customer's HIC15 against the other cars (MATLAB version).
%
% The same program as a9_benchmark.py, written for MATLAB. Run this from the
% unzipped pack folder. The customer's test is in crash/ and the tests from the
% two colleagues are in fleet/. For each car the program:
%   - reads the header (vehicle, test type, speed, sample rate),
%   - filters the three driver head axes at CFC 1000, resultant in g,
%   - finds HIC15 and its window, and HIC36 for comparison,
% then runs two checks (sample rate and filter) and saves fig1_fleet.svg
% (the HIC15 values) and fig2_resultants.svg (the head traces).

G = 9.80665;     % standard gravity, m/s^2
LIMIT = 700;     % FMVSS 208 limit on HIC15

cars = struct([]);
crash_files = dir(fullfile('crash', '*.json'));
fleet_files = dir(fullfile('fleet', '*.json'));
paths = {};
for m = 1:numel(crash_files)
    paths{end+1} = fullfile('crash', crash_files(m).name);
end
fleet_names = sort({fleet_files.name});
for m = 1:numel(fleet_names)
    paths{end+1} = fullfile('fleet', fleet_names{m});
end
for p = 1:numel(paths)
    path = paths{p};
    test = jsondecode(fileread(path));
    ch = struct();                           % each channel under its ISO code
    keys = fieldnames(test.channels);
    for m = 1:numel(keys)
        c = test.channels.(keys{m});
        ch.(['c' c.code]) = c;               % a field name has to start with a letter
    end
    hx = ch.c11HEADCG0000ACXP;
    dt = hx.dt;
    t0 = hx.t0;
    axes_g = cell(1, 3);
    letters = 'XYZ';
    for m = 1:3
        axes_g{m} = ch.(['c11HEADCG0000AC' letters(m) 'P']).y;
    end
    res = resultant(axes_g, dt, 1000, G);
    t_ms = 1000 * (t0 + dt * (0:numel(res)-1)');
    [h15, window] = hic(res, dt, 15);
    i = window(1);
    j = window(2);
    v = test.vehicle;
    statuses = {};
    codes = fieldnames(ch);
    for m = 1:numel(codes)
        statuses{end+1} = ch.(codes{m}).status;
    end
    car = struct();
    car.no = test.testNo;
    car.mine = startsWith(path, 'crash');
    car.info = test.test;
    car.model = v.model;
    car.name = sprintf('%d %s %s', v.year, title_case(v.make), title_case(strtrim(v.model)));
    car.axes = axes_g;
    car.dt = dt;
    car.t = t_ms;
    car.res = res;
    car.h15 = h15;
    car.h36 = hic(res, dt, 36);
    car.win = [t_ms(i), t_ms(j)];
    [car.peak, ip] = max(res);
    car.peak_t = t_ms(ip);
    car.descr = hx.comment;
    car.status = unique(statuses);
    if isempty(cars)
        cars = car;
    else
        cars(end+1) = car;
    end
end

for k = 1:numel(cars)
    c = cars(k);
    info = c.info;
    fprintf('%d %s  (model field ''%s'')\n', c.no, c.name, c.model);
    fprintf('   %s, %s, angle %g, %g km/h\n', info.type, info.config, info.angle, info.speed_kph);
    fprintf('   %.0f samples/s, head X described as ''%s'', status {''%s''}\n', ...
            1 / c.dt, c.descr, strjoin(c.status, ''', '''));
    fprintf('   HIC15 %.1f, window %.2f to %.2f ms, HIC36 %.1f, peak %.1f g at %.1f ms\n', ...
            c.h15, c.win(1), c.win(2), c.h36, c.peak, c.peak_t);
end

h15 = sort([cars.h15]);
me = cars([cars.mine]);                      % the customer's car
fprintf('\ncustomer''s car is %d of %d, lowest first\n', find(h15 == me.h15, 1), numel(cars));
fprintf('range %.1f to %.1f, median %.1f, highest is %.1f%% of the limit\n', ...
        h15(1), h15(end), median(h15), 100 * h15(end) / LIMIT);
for k = 1:numel(cars)
    c = cars(k);
    if ~c.mine
        fprintf('customer minus %s: HIC15 %+.1f, HIC36 %+.1f\n', c.name, ...
                me.h15 - c.h15, me.h36 - c.h36);
    end
end

% check 1: the customer's car was sampled twice as fast as the other two.
% Keep every second sample (10,000 a second, like the others) and recompute.
every_second = cell(1, 3);
for m = 1:3
    every_second{m} = me.axes{m}(1:2:end);
end
half = resultant(every_second, 2 * me.dt, 1000, G);
fprintf('\ncheck, customer''s car at half the sample rate: HIC15 %.1f\n', hic(half, 2 * me.dt, 15));
% check 2: no filter at all, every car
for k = 1:numel(cars)
    c = cars(k);
    raw = resultant(c.axes, c.dt, [], G);
    fprintf('check, %s with no filter: HIC15 %.1f\n', c.name, hic(raw, c.dt, 15));
end

% Figure 1: the three HIC15 values on a scale close enough to see the gaps
[~, order] = sort([cars.h15]);               % lowest HIC15 first
fig = figure('Position', [100 100 700 260]);
hold on
labels = cell(1, numel(order));
for k = 1:numel(order)
    c = cars(order(k));
    if c.mine
        color = [1 0.5 0.05];
        labels{k} = [c.name ' (customer)'];
    else
        color = [0.12 0.47 0.71];
        labels{k} = c.name;
    end
    plot(c.h15, k, 'o', 'MarkerSize', 9, 'MarkerFaceColor', color, 'Color', color);
    text(c.h15, k + 0.25, sprintf('%.1f', c.h15), 'HorizontalAlignment', 'center');
end
yticks(1:numel(order));
yticklabels(labels);
ylim([0.4, numel(order) + 0.8]);
xlim([100 220]);
xlabel('driver HIC15, CFC 1000 (no unit; the limit, 700, is off this scale)');
title('Figure 1. Driver HIC15, three cars, same barrier, about 56 km/h', 'FontSize', 10);
set(gca, 'XGrid', 'on');             % lines across the x axis only
saveas(fig, 'fig1_fleet.svg');
close(fig);

% Figure 2: the head resultant for each car with its HIC15 window shaded
fig = figure('Position', [100 100 700 700]);
top = 0;                                     % one vertical scale for all three, a little above the highest peak
for k = 1:numel(cars)
    top = max(top, 1.05 * cars(k).peak);
end
for k = 1:numel(cars)
    subplot(numel(cars), 1, k);
    c = cars(k);
    w = c.win;
    patch([w(1) w(2) w(2) w(1)], [0 0 top top], [1 0.5 0.05], 'FaceAlpha', 0.25, ...
          'EdgeColor', 'none');
    hold on
    plot(c.t, c.res, 'LineWidth', 0.9);
    xlim([-10 200]);
    ylim([0 top]);
    title(sprintf('%s (test %d): HIC15 %.1f, window %.1f to %.1f ms', ...
                  c.name, c.no, c.h15, w(1), w(2)), 'FontSize', 9);
    ylabel('head resultant (g)');
end
xlabel('time from impact (ms)');
saveas(fig, 'fig2_resultants.svg');
close(fig);


function out = cfc(y, dt, cls)
    % SAE J211-1 filter class: 4-pole Butterworth, forward then backward.
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


function [best, window] = hic(a_g, dt, limit_ms)
    % HIC over every window up to limit_ms. Returns the value and [first, last].
    panels = (a_g(2:end) + a_g(1:end-1)) / 2 * dt;
    S = [0; cumsum(panels)];
    kmax = round(limit_ms / 1000 / dt);       % the limit in samples
    best = 0;
    window = [1, 1];
    for k = 1:kmax
        T = k * dt;
        v = T * max((S(k+1:end) - S(1:end-k)) / T, 0).^2.5;   % every start at once
        [top, i] = max(v);
        if top > best
            best = top;
            window = [i, i + k];
        end
    end
end


function r = resultant(axes_g, dt, cls, G)
    % Filter each axis (an empty cls skips it), then the resultant in g.
    if ~isempty(cls)
        for m = 1:3
            axes_g{m} = cfc(axes_g{m}, dt, cls);
        end
    end
    r = sqrt(axes_g{1}.^2 + axes_g{2}.^2 + axes_g{3}.^2) / G;
end


function s = title_case(s)
    % Capital first letter on each word, the rest lower case, like Python's .title().
    s = lower(s);
    starts = [1, find(~isletter(s(1:end-1))) + 1];
    s(starts) = upper(s(starts));
end
