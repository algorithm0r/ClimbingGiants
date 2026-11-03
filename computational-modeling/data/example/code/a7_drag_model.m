% Assignment 7: is quadratic drag worth adding to the shot-flight model? (MATLAB version)
%
% The same program as a7_drag_model.py, written for MATLAB. Run it from the
% unzipped pack folder. For every training arc it finds the free flight (the
% release and end rules from assignment 5) and takes a starting position and
% velocity from a fit to the first 6, 10 or 14 frames of it. From there it steps
% the flight forward with RK4 three ways: with no drag, and with quadratic drag at
% each end of the range of k worked out on the notes page State as a vector. Each
% stepped flight is scored on the frames the fit did not see, and on the measured
% rim crossing where the ball reaches rim height before it touches anything. It
% prints the drag constants, the step-size check, a line per arc and a summary,
% and saves convergence.svg, one_arc.svg and errors.svg.
%
% MATLAB counts from 1 and Python from 0. The printed frame numbers subtract 1, so
% they are the same frame numbers the report (and the Python program) give.

G = 9.81;               % m/s^2
WINDOW = 9;             % frames in each acceleration estimate (0.32 s)
TOL = 5.0;              % m/s^2, how close to -g counts as free flight
RUN = 4;                % frames in a row it has to stay that close
RIM = 3.048;            % m, rim height (from the header)
FIT_LENGTHS = [6, 10, 14];
H = 0.04;               % s, the step (one frame), chosen by the halving check below
SHOW = 662;             % the arc drawn in one_arc.svg

% k = rho C_D A / (2 m), with the numbers given on the notes page State as a vector
RHO = 1.20;             % kg/m^3, air at 20 C and sea-level pressure
CD_LOW = 0.30;          % drag coefficient, low end of the wind-tunnel range
CD_HIGH = 0.40;         % high end
MASS_LOW = 0.580;       % kg, lightest ball the rules allow
MASS_HIGH = 0.620;      % kg, heaviest

train = load_shots('train');
header = train.header;
shots = train.shots;
noise_z = header.tracking_noise.vertical_m;
noise_xy = header.tracking_noise.horizontal_m;
fprintf('tracking noise from the header: vertical %.2f cm, horizontal %.2f cm\n', ...
        100 * noise_z, 100 * noise_xy);

area = pi * header.ball_radius_m ^ 2;
K_LOW = RHO * CD_LOW * area / (2 * MASS_HIGH);      % least drag: low C_D, heavy ball
K_HIGH = RHO * CD_HIGH * area / (2 * MASS_LOW);     % most drag: high C_D, light ball
DRAGS = [0.0, K_LOW, K_HIGH];
fprintf('ball cross-section %.4f m^2, k from %.4f to %.4f per m\n', area, K_LOW, K_HIGH);

% the free flight in every training arc
arcs = struct('id', {}, 't', {}, 'x', {}, 'y', {}, 'z', {}, 'r', {}, 'e', {});
for m = 1:numel(shots)
    s = shots(m);
    if straight_run(s.z, 6)
        fprintf('arc %d dropped: its height runs in a straight line (a filled gap)\n', s.id);
        continue
    end
    arcs(end+1) = struct('id', s.id, 't', s.t, 'x', s.x, 'y', s.y, 'z', s.z, ...
                         'r', release(s.t, s.z, WINDOW, G, TOL, RUN), ...
                         'e', flight_end(s.t, s.z, WINDOW, G, TOL, RUN, RIM));
end
fprintf('%d arcs used\n', numel(arcs));

% with no drag the stepped ball should follow the fitted parabola exactly
fprintf('\n');
worst = 0.0;
for m = 1:numel(arcs)
    a = arcs(m);
    [t_mid, s0] = start_state(a.t, a.x, a.y, a.z, a.r, 10, G);
    dt = a.t(a.e) - t_mid;
    parabola = [s0(1) + s0(4) * dt; s0(2) + s0(5) * dt; ...
                s0(3) + s0(6) * dt - 0.5 * G * dt ^ 2];
    stepped = step_to(s0, t_mid, a.t(a.e), 0.0, H, G);
    worst = max(worst, max(abs(stepped(1:3) - parabola)));
end
fprintf('no drag, step %g s: largest gap from the fitted parabola %.6f mm\n', H, 1000 * worst);

% step size: halve it and watch the position at the end of each free flight
fprintf('with drag (k = %.4f), 10 frames fitted: largest change in any arc when the step is halved\n', ...
        K_HIGH);
steps = [0.08, 0.04, 0.02, 0.01, 0.005];
ends = cell(1, numel(steps));
for k = 1:numel(steps)
    rows = zeros(numel(arcs), 3);
    for m = 1:numel(arcs)
        a = arcs(m);
        [t_mid, s0] = start_state(a.t, a.x, a.y, a.z, a.r, 10, G);
        s = step_to(s0, t_mid, a.t(a.e), K_HIGH, steps(k), G);
        rows(m, :) = s(1:3).';
    end
    ends{k} = rows;
end
changes = [];
for k = 2:numel(steps)
    gap = sqrt(sum((ends{k} - ends{k-1}) .^ 2, 2));     % one per arc
    changes(end+1) = max(gap);
    line = sprintf('  %.3f s to %.3f s: %.2e mm', steps(k-1), steps(k), 1000 * changes(end));
    if k > 2
        line = [line, sprintf('   ratio %.1f', changes(end-1) / changes(end))];
    end
    fprintf('%s\n', line);
end

% every arc, every fit length, all three models
results = cell(1, numel(FIT_LENGTHS));
crossings = cell(1, numel(FIT_LENGTHS));
for k = 1:numel(FIT_LENGTHS)
    n_fit = FIT_LENGTHS(k);
    rows = zeros(numel(arcs), 3);
    cross_rows = [];
    for m = 1:numel(arcs)
        a = arcs(m);
        [t_mid, s0] = start_state(a.t, a.x, a.y, a.z, a.r, n_fit, G);
        for j = 1:3
            rows(m, j) = unseen_error(a.t, a.x, a.y, a.z, a.r + n_fit, a.e, t_mid, s0, ...
                                      DRAGS(j), H, G);
        end
        % the measured crossing counts only if the free flight reaches it: no more
        % than half an acceleration window between the end of the flight and it
        [i, tc, xc, yc] = measured_crossing(a.t, a.x, a.y, a.z, RIM);
        if i - a.e <= floor(WINDOW / 2)
            row = a.id;
            for j = 1:3
                [tp, xp, yp] = stepped_crossing(t_mid, s0, DRAGS(j), H, G, RIM);
                row(end+1) = sqrt((xp - xc) ^ 2 + (yp - yc) ^ 2);
            end
            cross_rows(end+1, :) = row;
        end
    end
    results{k} = 100 * rows;                               % to cm
    crossings{k} = cross_rows .* [1, 100, 100, 100];       % id stays
end

fprintf('\n');
fprintf('10 frames fitted: rms error on the unseen frames (cm)\n');
fprintf('%5s %7s %4s %8s %6s %6s\n', 'arc', 'release', 'end', 'no drag', 'k low', 'k high');
u10 = results{2};
for m = 1:numel(arcs)
    fprintf('%5d %7d %4d %8.1f %6.1f %6.1f\n', arcs(m).id, arcs(m).r - 1, arcs(m).e - 1, ...
            u10(m, 1), u10(m, 2), u10(m, 3));
end
fprintf('arcs whose free flight reaches the measured crossing: %s\n', ...
        strtrim(sprintf('%d ', crossings{2}(:, 1))));

fprintf('\n');
for k = 1:numel(FIT_LENGTHS)
    u = results{k};
    c = crossings{k};
    med = median(u, 1);
    cmed = median(c(:, 2:4), 1);
    fprintf('%d frames fitted (medians over the arcs, cm)\n', FIT_LENGTHS(k));
    fprintf('  unseen frames, %d arcs:  no drag %.1f  k low %.1f  k high %.1f   drag closer on %d and %d\n', ...
            size(u, 1), med(1), med(2), med(3), sum(u(:, 2) < u(:, 1)), sum(u(:, 3) < u(:, 1)));
    fprintf('  rim crossing, %d arcs:    no drag %.1f  k low %.1f  k high %.1f   drag closer on %d and %d\n', ...
            size(c, 1), cmed(1), cmed(2), cmed(3), sum(c(:, 3) < c(:, 2)), sum(c(:, 4) < c(:, 2)));
end

% Figure 1: the step check
fig = figure('Position', [100 100 600 400]);
loglog(steps(2:end), 1000 * changes, 'o-');
hold on
plot([steps(end), steps(2)], [1, 1] * 1000 * noise_z, '--', 'Color', [0.5 0.5 0.5]);
xlabel('step after halving (s)');
ylabel('largest change in an arc (mm)');
title('Change in the stepped position when the step is halved');
legend({sprintf('k = %.4f per m', K_HIGH), 'tracker noise, 3.07 cm'});
saveas(fig, 'convergence.svg');
close(fig);

% Figure 2: one arc, all three models, side view
s = find_shot(shots, SHOW);
r = release(s.t, s.z, WINDOW, G, TOL, RUN);
e = flight_end(s.t, s.z, WINDOW, G, TOL, RUN, RIM);
[t_mid, s0] = start_state(s.t, s.x, s.y, s.z, r, 10, G);
d = sqrt((s.x - s.hoop_x) .^ 2 + (s.y - s.hoop_y) .^ 2);   % distance from the hoop
fig = figure('Position', [100 100 700 400]);
plot(d, s.z, '.', 'Color', [0.8 0.8 0.8]);
hold on
plot(d(r:e), s.z(r:e), 'k.');
plot(d(r:r+9), s.z(r:r+9), 'ko');
names = {'no drag', sprintf('k = %.4f', K_LOW), sprintf('k = %.4f', K_HIGH)};
for j = 1:3
    path = s0.';
    state = s0;
    while ~(state(3) < RIM && state(6) < 0)    % until it comes down through the rim
        state = rk4_step(state, H, DRAGS(j), G);
        path(end+1, :) = state.';
    end
    plot(sqrt((path(:, 1) - s.hoop_x) .^ 2 + (path(:, 2) - s.hoop_y) .^ 2), path(:, 3));
end
yline(RIM, '--', 'Color', [0.5 0.5 0.5]);
xlim([0, d(r) + 0.5]);
ylim([RIM - 0.5, max(s.z) + 0.3]);
set(gca, 'XDir', 'reverse');
title(sprintf('Arc %d: stepped from 10 fitted frames, three ways', SHOW));
xlabel('distance from the hoop center across the floor (m)');
ylabel('ball height (m)');
legend([{'all frames', 'free flight', 'the 10 frames fitted'}, names]);
saveas(fig, 'one_arc.svg');
close(fig);

% Figure 3: median errors against frames fitted
fig = figure('Position', [100 100 900 380]);
marks = {'o-', 's-', '^-'};
for j = 1:3
    unseen = zeros(1, numel(FIT_LENGTHS));
    cross = zeros(1, numel(FIT_LENGTHS));
    for k = 1:numel(FIT_LENGTHS)
        unseen(k) = median(results{k}(:, j));
        cross(k) = median(crossings{k}(:, j + 1));
    end
    subplot(1, 2, 1);
    plot(FIT_LENGTHS, unseen, marks{j});
    hold on
    subplot(1, 2, 2);
    plot(FIT_LENGTHS, cross, marks{j});
    hold on
end
subplot(1, 2, 1);
title(sprintf('rms error on the unseen frames, %d arcs', numel(arcs)));
ylabel('median rms distance (cm)');
subplot(1, 2, 2);
title(sprintf('Error at the rim crossing, %d arcs', size(crossings{2}, 1)));
ylabel('median distance across the floor (cm)');
for j = 1:2
    subplot(1, 2, j);
    yline(100 * noise_z, '--', 'Color', [0.5 0.5 0.5]);
    xlabel('frames fitted for the starting state');
    xticks(FIT_LENGTHS);
    ylim([0, Inf]);
    legend([names, {'tracker noise'}]);
end
saveas(fig, 'errors.svg');
close(fig);


function d = load_shots(name)
    d = jsondecode(fileread(['shots/' name '.json']));
    if iscell(d.shots)
        % jsondecode gives a cell array when the shots do not all have the same
        % fields (some carry an extra one). Keep the fields used here.
        cells = d.shots;
        d.shots = struct('id', {}, 't', {}, 'x', {}, 'y', {}, 'z', {}, ...
                         'hoop_x', {}, 'hoop_y', {});
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


function r = release(t, z, WINDOW, G, TOL, RUN)
    % The first frame after the last upward push at which the acceleration is
    % within TOL of -g and stays there for RUN frames. Empty if it never does.
    a = accel(t, z, WINDOW);
    [~, top] = max(z);
    first = floor(WINDOW / 2) + 1;
    for i = 1:top-1
        if a(i) > 0
            first = i + 1;     % the hand is still pushing at frame i
        end
    end
    r = [];
    for i = first:numel(t)-RUN+1
        if all(abs(a(i:i+RUN-1) + G) < TOL)
            r = i;
            return
        end
    end
end


function e = flight_end(t, z, WINDOW, G, TOL, RUN, RIM)
    % Last frame of the free flight: the frame before the acceleration leaves the
    % band for RUN frames in a row (the ball has hit something), or the frame
    % before the ball drops through rim height, whichever comes first.
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


function found = straight_run(z, frames)
    % True if the height falls on a straight line for 'frames' steps or more.
    % Measured heights carry about 3 cm of noise, so a straight line means the
    % tracker filled a gap.
    flat = abs(diff(z, 2)) < 0.001;
    found = false;
    for i = 1:numel(flat)-frames+2
        if all(flat(i:i+frames-2))
            found = true;
            return
        end
    end
end


function [t_mid, s] = start_state(t, x, y, z, first, n, G)
    % Position and velocity at the middle of n frames starting at 'first', from
    % straight lines in x and y and a parabola in z with gravity held at 9.81.
    % Time is measured from the middle of the fitted frames, so each fit's constant
    % is the position there and its slope is the velocity there.
    idx = first:first+n-1;
    t_mid = mean(t(idx));
    dt = t(idx) - t_mid;
    A = [ones(size(dt)), dt];
    cx = A \ x(idx);
    cy = A \ y(idx);
    cz = A \ (z(idx) + 0.5 * G * dt .^ 2);
    s = [cx(1); cy(1); cz(1); cx(2); cy(2); cz(2)];
end


function ds = rate(s, drag_k, G)
    % The rate of the state s = [x; y; z; vx; vy; vz]. Drag acts against the
    % velocity and grows with the speed squared, so every direction needs the speed.
    vx = s(4);
    vy = s(5);
    vz = s(6);
    speed = sqrt(vx ^ 2 + vy ^ 2 + vz ^ 2);
    ds = [vx; vy; vz;
          -drag_k * speed * vx;
          -drag_k * speed * vy;
          -G - drag_k * speed * vz];
end


function s = rk4_step(s, h, drag_k, G)
    k1 = rate(s, drag_k, G);
    k2 = rate(s + h / 2 * k1, drag_k, G);
    k3 = rate(s + h / 2 * k2, drag_k, G);
    k4 = rate(s + h * k3, drag_k, G);
    s = s + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
end


function s = step_to(s, t_from, t_to, drag_k, h_max, G)
    % Step the state from t_from to t_to in equal steps no longer than about
    % h_max, so that the last step lands exactly on t_to.
    n = max(1, floor((t_to - t_from) / h_max + 0.5));
    h = (t_to - t_from) / n;
    for i = 1:n
        s = rk4_step(s, h, drag_k, G);
    end
end


function err = unseen_error(t, x, y, z, first, last, t_mid, s, drag_k, H, G)
    % rms distance (m) between the stepped ball and the measured ball over
    % frames first .. last.
    t_now = t_mid;
    gaps = [];
    for j = first:last
        s = step_to(s, t_now, t(j), drag_k, H, G);
        t_now = t(j);
        gaps(end+1) = sqrt((s(1) - x(j)) ^ 2 + (s(2) - y(j)) ^ 2 + (s(3) - z(j)) ^ 2);
    end
    err = sqrt(mean(gaps .^ 2));
end


function [t_cross, x_cross, y_cross] = stepped_crossing(t_now, s, drag_k, H, G, RIM)
    % Time and floor position where the stepped ball comes down through rim
    % height: steps of H until it is below the rim on the way down, then bisection
    % on the length of that last step, to a microsecond.
    while true
        s_next = rk4_step(s, H, drag_k, G);
        if s_next(3) < RIM && s_next(6) < 0
            break
        end
        s = s_next;
        t_now = t_now + H;
    end
    lo = 0.0;          % a step this long ends above the rim
    hi = H;            % and this long ends below it
    while hi - lo > 1e-6
        mid = (lo + hi) / 2;
        trial = rk4_step(s, mid, drag_k, G);
        if trial(3) > RIM
            lo = mid;
        else
            hi = mid;
        end
    end
    s = rk4_step(s, lo, drag_k, G);
    t_cross = t_now + lo;
    x_cross = s(1);
    y_cross = s(2);
end


function s = find_shot(shots, wanted)
    % The shot whose id is wanted.
    for m = 1:numel(shots)
        if shots(m).id == wanted
            s = shots(m);
            return
        end
    end
end


function [i, tc, xc, yc] = measured_crossing(t, x, y, z, RIM)
    % The rim crossing in the record: the last frame above rim height after the
    % top, and a straight line from it to the next frame (which is below).
    [~, i] = max(z);
    while z(i + 1) >= RIM
        i = i + 1;
    end
    f = (z(i) - RIM) / (z(i) - z(i + 1));     % how far from frame i to frame i+1
    tc = t(i) + f * (t(i + 1) - t(i));
    xc = x(i) + f * (x(i + 1) - x(i));
    yc = y(i) + f * (y(i + 1) - y(i));
end
