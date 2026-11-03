% Assignment 8: 90% intervals on where each short record comes down through rim
% height (MATLAB version).
%
% The same program as a8_crossing_intervals.py, written for MATLAB. Run it from
% the unzipped pack folder. For each short record it fits the frames after the
% last upward push (a parabola in height with gravity held at 9.81, and straight
% lines across the floor), solves for the point where the falling ball reaches rim
% height, and splits that point into long/short (along the line from the first
% fitted frame to the hoop) and left/right (across that line). It then adds noise
% at the tracker's stated level to the fitted frames and fits and solves again,
% 1000 times. The 50 lowest and 50 highest answers are left out, and the other 900
% span the 90% interval.
%
% The training arcs are cut to the length of a short record and given the same
% intervals, which are checked against where each whole arc says the ball came
% down. It prints a line per record and per arc and the counts, and saves
% cloud.svg, short_intervals.svg and coverage.svg.
%
% MATLAB's random numbers are not numpy's, so the intervals come out a little
% different from the Python version's.

G = 9.81;              % m/s^2, held fixed
RIM = 3.048;           % m, rim height (from the header)
WINDOW = 9;            % frames in each acceleration estimate (0.32 s)
TOL = 5.0;             % m/s^2, how close to -g counts as free flight
RUN = 4;               % frames in a row, for the end of a whole flight
DRAWS = 1000;          % reruns per record
LEAVE = DRAWS / 20;    % 50 answers left out at each end, which leaves 90%
SEED = 8;              % the same random numbers on every run
SHOW = 1299;           % the short record drawn in cloud.svg

rng(SEED);
train = load_shots('train');
short = load_shots('test_short');
noise = train.header.tracking_noise;
SIG_Z = noise.vertical_m;
SIG_XY = noise.horizontal_m;
fprintf('tracker noise from the header: vertical %.2f cm, horizontal %.2f cm\n', ...
        100 * SIG_Z, 100 * SIG_XY);

% how many frames does a short record have after the last push?
after = zeros(numel(short.shots), 1);
for m = 1:numel(short.shots)
    s = short.shots(m);
    after(m) = numel(s.t) - last_push(s.t, s.z, WINDOW);
end
N_AFTER = median(after);
fprintf('frames after the last upward push in the short records: median %d, range %d to %d\n', ...
        N_AFTER, min(after), max(after));

% the 12 short records
fprintf('\n');
fprintf('short records, 90%% intervals (m): past the hoop center, and right of the line to it\n');
fprintf('%5s %6s %6s %16s %6s %16s\n', 'id', 'fitted', 'long', '90% interval', 'right', '90% interval');
nshort = numel(short.shots);
ids = zeros(nshort, 1);
vals = zeros(nshort, 2);
los = zeros(nshort, 2);
his = zeros(nshort, 2);
for m = 1:nshort
    s = short.shots(m);
    first = last_push(s.t, s.z, WINDOW) + 1;
    [v, lo, hi, runs] = interval(s.t, s.x, s.y, s.z, first, s, DRAWS, LEAVE, SIG_Z, SIG_XY, G, RIM);
    ids(m) = s.id;
    vals(m, :) = v;
    los(m, :) = lo;
    his(m, :) = hi;
    if s.id == SHOW
        show_runs = runs;
        show_v = v;
    end
    fprintf('%5d %6d %+6.2f [%+6.2f, %+6.2f] %+6.2f [%+6.2f, %+6.2f]\n', s.id, ...
            numel(s.t) - first + 1, v(1), lo(1), hi(1), v(2), lo(2), hi(2));
end
widths = his - los;
fprintf('median width: long/short %.2f m, left/right %.2f m\n', ...
        median(widths(:, 1)), median(widths(:, 2)));

% held fixed: the first fitted frame. Start one frame later and see how far it moves
moved = zeros(nshort, 2);
for m = 1:nshort
    s = short.shots(m);
    first = last_push(s.t, s.z, WINDOW) + 2;
    f = first:numel(s.t);
    [tc, xc, yc] = crossing(s.t(f), s.x(f), s.y(f), s.z(f), false, G, RIM);
    [lng, rgt] = split_point(xc, yc, s, s.x(first), s.y(first));
    moved(m, :) = abs([lng, rgt] - vals(m, :));
end
fprintf('starting one frame later moves the value by a median of %.2f m long/short and %.2f m left/right\n', ...
        median(moved(:, 1)), median(moved(:, 2)));

% the training arcs, cut to the same number of frames after the last push
fprintf('\n');
fprintf('training arcs cut %d frames after the last push; answer = whole flight fitted, gravity free\n', N_AFTER);
fprintf('%5s %16s %6s %6s %16s %6s %6s\n', 'id', 'long', 'answer', 'seen', 'right', 'answer', 'seen');
cover = zeros(0, 6);
checked = zeros(0, 2);
arc_rows = zeros(0, 2);
for m = 1:numel(train.shots)
    s = train.shots(m);
    t = s.t;
    x = s.x;
    y = s.y;
    z = s.z;
    if filled_in(z)
        fprintf('%5d  left out: a stretch of the height is filled in\n', s.id);
        continue
    end
    % the answer: the whole free flight, fitted with gravity free, solved for rim height
    r = release(t, z, WINDOW, G, TOL, RUN);
    e = flight_end(t, z, WINDOW, G, TOL, RUN, RIM);
    [tc, xc, yc] = crossing(t(r:e), x(r:e), y(r:e), z(r:e), true, G, RIM);
    % the record as a short record would have been, and its interval
    last = last_push(t, z, WINDOW) + N_AFTER;
    tk = t(1:last);
    xk = x(1:last);
    yk = y(1:last);
    zk = z(1:last);
    first = last_push(tk, zk, WINDOW) + 1;
    [v, lo, hi, runs] = interval(tk, xk, yk, zk, first, s, DRAWS, LEAVE, SIG_Z, SIG_XY, G, RIM);
    [a1, a2] = split_point(xc, yc, s, xk(first), yk(first));
    answer = [a1, a2];
    cover(end+1, :) = [lo(1) <= answer(1) && answer(1) <= hi(1), lo(2) <= answer(2) && answer(2) <= hi(2), ...
                       answer(1) < lo(1), answer(1) > hi(1), answer(2) < lo(2), answer(2) > hi(2)];
    arc_rows(end+1, :) = [lo(1) - answer(1), hi(1) - answer(1)];
    % if the ball came down through rim height before touching anything (the
    % flight runs to within half a window of it), the frames show the crossing too
    [k, xo, yo] = observed(x, y, z, RIM);
    if e >= k - floor(WINDOW / 2)
        [o1, o2] = split_point(xo, yo, s, xk(first), yk(first));
        checked(end+1, :) = [lo(1) <= o1 && o1 <= hi(1), lo(2) <= o2 && o2 <= hi(2)];
        seen = {sprintf('%+6.2f', o1), sprintf('%+6.2f', o2)};
    else
        seen = {'-', '-'};
    end
    fprintf('%5d [%+6.2f, %+6.2f] %+6.2f %6s [%+6.2f, %+6.2f] %+6.2f %6s\n', s.id, ...
            lo(1), hi(1), answer(1), seen{1}, lo(2), hi(2), answer(2), seen{2});
end
n = size(cover, 1);
fprintf('\n');
fprintf('answer inside the 90%% interval, %d arcs: long/short %d, left/right %d\n', ...
        n, sum(cover(:, 1)), sum(cover(:, 2)));
fprintf('  long/short outside: %d shorter, %d longer\n', sum(cover(:, 3)), sum(cover(:, 4)));
fprintf('  left/right outside: %d further left, %d further right\n', sum(cover(:, 5)), sum(cover(:, 6)));
fprintf('crossing seen in the frames, %d arcs: inside long/short %d, left/right %d\n', ...
        size(checked, 1), sum(checked(:, 1)), sum(checked(:, 2)));

% Figure 1: the reruns for one short record, as points where the ball crosses
fig = figure('Position', [100 100 550 550]);
plot(show_runs(:, 2), show_runs(:, 1), '.', 'MarkerSize', 4);
hold on
plot(show_v(2), show_v(1), 'kx', 'MarkerSize', 10);
angle = linspace(0, 2 * pi, 200);
hoop_r = train.header.hoop_inner_radius_m;
plot(hoop_r * cos(angle), hoop_r * sin(angle), 'k-');
axis equal
xlabel('right of the line to the hoop (m)');
ylabel('past the hoop center (m)');
title(sprintf('Short record %d: where the reruns cross rim height', SHOW));
legend({sprintf('%d reruns', DRAWS), 'fitted to the record', 'inside of the rim'});
saveas(fig, 'cloud.svg');
close(fig);

% Figure 2: the intervals on the 12 short records
fig = figure('Position', [100 100 900 420]);
labels = {'past the hoop center (m)', 'right of the line to the hoop (m)'};
titles = {'Long (+) or short (-)', 'Right (+) or left (-)'};
for col = 1:2
    subplot(1, 2, col);
    hold on
    for p = 1:nshort
        plot([los(p, col), his(p, col)], [p, p], 'k-');
        plot(vals(p, col), p, 'ko');
    end
    plot([0, 0], [0, nshort + 1], '-', 'Color', [0.5 0.5 0.5]);
    xlabel(labels{col});
    title(titles{col});
    set(gca, 'YTick', 1:nshort, 'YTickLabel', arrayfun(@num2str, ids, 'UniformOutput', false));
end
subplot(1, 2, 1);
ylabel('short record (shot id)');
saveas(fig, 'short_intervals.svg');
close(fig);

% Figure 3: the long/short check on the training arcs, each interval drawn
% relative to its answer, so an interval that misses the zero line missed
fig = figure('Position', [100 100 700 420]);
hold on
for p = 1:n
    if arc_rows(p, 1) <= 0 && 0 <= arc_rows(p, 2)
        color = [0.12 0.47 0.71];
    else
        color = [0.84 0.15 0.16];
    end
    plot([p, p], arc_rows(p, :), '-', 'Color', color, 'LineWidth', 3);
end
plot([0, n + 1], [0, 0], 'k-');
xlabel('training arc, cut to a short record (in file order)');
ylabel('interval minus the answer (m)');
title(sprintf('Long/short 90%% intervals against the whole-flight answer, %d arcs', n));
saveas(fig, 'coverage.svg');
close(fig);


function d = load_shots(name)
    d = jsondecode(fileread(['shots/' name '.json']));
    if iscell(d.shots)
        % jsondecode gives a cell array when the shots do not all have the same
        % fields (some carry an extra one). Keep the fields used here.
        cells = d.shots;
        d.shots = struct('id', {}, 't', {}, 'x', {}, 'y', {}, 'z', {}, 'hoop_x', {}, 'hoop_y', {});
        for m = 1:numel(cells)
            d.shots(m).id = cells{m}.id;
            d.shots(m).t = cells{m}.t;
            d.shots(m).x = cells{m}.x;
            d.shots(m).y = cells{m}.y;
            d.shots(m).z = cells{m}.z;
            d.shots(m).hoop_x = cells{m}.hoop_x;
            d.shots(m).hoop_y = cells{m}.hoop_y;
        end
    end
end


function a = accel(t, z, WINDOW)
    % Vertical acceleration at every frame, from a parabola through the 9 frames
    % centered on it. NaN where the window runs off either end.
    h = floor(WINDOW / 2);
    a = nan(numel(t), 1);
    for i = h+1:numel(t)-h
        c = polyfit(t(i-h:i+h) - t(i), z(i-h:i+h), 2);
        a(i) = 2 * c(1);
    end
end


function last = last_push(t, z, WINDOW)
    % The last frame before the top where the acceleration is upward (the hand
    % is still on the ball). With no such frame, the first frame that has an
    % acceleration estimate.
    a = accel(t, z, WINDOW);
    [~, top] = max(z);
    last = floor(WINDOW / 2) + 1;
    for i = 1:top-1
        if a(i) > 0
            last = i;
        end
    end
end


function r = release(t, z, WINDOW, G, TOL, RUN)
    % Assignment 5's release on a whole arc: the first frame after the last push
    % where the acceleration is within TOL of -g for RUN frames in a row.
    a = accel(t, z, WINDOW);
    r = [];
    for i = last_push(t, z, WINDOW)+1:numel(t)-RUN+1
        if all(abs(a(i:i+RUN-1) + G) < TOL)
            r = i;
            return
        end
    end
end


function e = flight_end(t, z, WINDOW, G, TOL, RUN, RIM)
    % Assignment 5's end of a whole flight: the frame before the acceleration
    % leaves the band for RUN frames (the ball hit something), or before the ball
    % drops below rim height, whichever comes first.
    a = accel(t, z, WINDOW);
    [~, top] = max(z);
    for i = top:numel(t)-RUN+1
        if all(abs(a(i:i+RUN-1) + G) >= TOL) || z(i) < RIM
            e = i - 1;
            return
        end
    end
    e = numel(t);
end


function f = filled_in(z)
    % True if the height runs in a straight line for 6 steps or more, which
    % 3 cm of tracking noise cannot do (the tracker filled a gap).
    flat = abs(diff(z, 2)) < 0.001;
    f = false;
    for i = 1:numel(flat)-4
        if all(flat(i:i+4))
            f = true;
            return
        end
    end
end


function c = fit_line(t, v)
    % Least-squares straight line v = c(1) + c(2) t.
    A = [ones(size(t)), t];
    c = A \ v;
end


function [tc, xc, yc] = crossing(t, x, y, z, fit_gravity, G, RIM)
    % Fit the frames given and solve for the falling crossing of rim height.
    % Returns the time from the first frame given, and x and y there.
    t = t - t(1);
    if fit_gravity
        A = [ones(size(t)), t, t.^2];
        c = A \ z;
    else   % the known term moves to the left-hand side
        c = fit_line(t, z + 0.5 * G * t.^2);
        c(3) = -G / 2;
    end
    % c3 t^2 + c2 t + (c1 - RIM) = 0; with c3 < 0 the later root has the minus sign
    tc = (-c(2) - sqrt(c(2)^2 - 4 * c(3) * (c(1) - RIM))) / (2 * c(3));
    bx = fit_line(t, x);
    by = fit_line(t, y);
    xc = bx(1) + bx(2) * tc;
    yc = by(1) + by(2) * tc;
end


function [k, xc, yc] = observed(x, y, z, RIM)
    % The frame just before the ball comes down through rim height, and where it
    % crossed, by straight-line interpolation between that frame and the next.
    [~, top] = max(z);
    for k = top:numel(z)-1
        if z(k) >= RIM && z(k+1) < RIM
            f = (z(k) - RIM) / (z(k) - z(k+1));
            xc = x(k) + f * (x(k+1) - x(k));
            yc = y(k) + f * (y(k+1) - y(k));
            return
        end
    end
end


function [lng, rgt] = split_point(x, y, s, x0, y0)
    % A crossing point as long and right: meters past the hoop center along the
    % line from (x0, y0), the first fitted frame, to the hoop, and meters to the
    % right of that line as the shooter sees it.
    ux = s.hoop_x - x0;
    uy = s.hoop_y - y0;
    n = hypot(ux, uy);
    ux = ux / n;
    uy = uy / n;
    dx = x - s.hoop_x;
    dy = y - s.hoop_y;
    lng = dx * ux + dy * uy;
    rgt = uy * dx - ux * dy;
end


function [value, lo, hi, runs] = interval(t, x, y, z, first, s, DRAWS, LEAVE, SIG_Z, SIG_XY, G, RIM)
    % The crossing from the frames, and its 90% interval from DRAWS reruns with
    % the tracker's noise added to the fitted frames. Returns the value, the low
    % and high ends (each as long, right) and every rerun's answer.
    t = t(first:end);
    x = x(first:end);
    y = y(first:end);
    z = z(first:end);
    [tc, xc, yc] = crossing(t, x, y, z, false, G, RIM);
    [v1, v2] = split_point(xc, yc, s, x(1), y(1));
    value = [v1, v2];
    runs = zeros(DRAWS, 2);
    for k = 1:DRAWS
        zk = z + SIG_Z * randn(numel(z), 1);
        xk = x + SIG_XY * randn(numel(x), 1);
        yk = y + SIG_XY * randn(numel(y), 1);
        [tc, xc, yc] = crossing(t, xk, yk, zk, false, G, RIM);
        [r1, r2] = split_point(xc, yc, s, x(1), y(1));
        runs(k, :) = [r1, r2];
    end
    ends = sort(runs);
    lo = ends(LEAVE + 1, :);
    hi = ends(DRAWS - LEAVE, :);
end
