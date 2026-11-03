% Assignment 6: when and where each short-record shot comes down through the rim
% (MATLAB version).
%
% The same program as a6_rim_crossing.py, written for MATLAB. Run it from the
% unzipped pack folder. For each of the 12 short test records it finds the frames
% of free flight, fits the height with gravity held at 9.81 m/s^2 and the two
% floor coordinates with straight lines, and finds the falling crossing of rim
% height by bisection. Before that it tries the same method on the training arcs,
% cut to the same number of flight frames, and compares each prediction with the
% one the whole flight gives and with the play-by-play. It prints what it finds
% and saves short_record.svg, training_check.svg and predictions.svg.
%
% MATLAB counts from 1 and Python from 0. The printed frame numbers subtract 1, so
% they are the same frame numbers the report (and the Python program) give.

G = 9.81;               % m/s^2, held (assignment 5)
WINDOW = 9;             % frames in each acceleration estimate, as in assignment 5
NEAR_HOOP = 1.0;        % m, a whole flight ends at the last frame this far from the hoop
TOL_T = 1e-6;           % s, bisection stops when the bracket is this narrow
SKIP = [325];           % training arc with a filled-in gap (found in assignment 5)
SHOW = 158;             % the short record drawn in short_record.svg

short = load_shots('test_short');
h = short.header;
rim = h.rim_height_m;
in_r = h.hoop_inner_radius_m - h.ball_radius_m;     % clears the rim on every side
out_r = h.hoop_inner_radius_m + h.ball_radius_m;    % cannot touch the rim
fprintf('short records, header says they begin: %s\n', h.record_begins);
fprintf('rim %g m, in radius %.4f m, out radius %.4f m\n', rim, in_r, out_r);

% where does each short record start, and how much flight does it hold?
fprintf('\n');
fprintf('%5s %17s %9s %12s %14s\n', 'shot', 'height at frame 0', 'last push', ...
        'frames after', 'up through rim');
n_after = zeros(numel(short.shots), 1);
for m = 1:numel(short.shots)
    s = short.shots(m);
    p = last_push(s.t, s.z, WINDOW);
    up = find(s.z >= rim, 1);              % first frame at or above the rim
    n_after(m) = numel(s.t) - p;
    fprintf('%5d %15.2f m %9d %12d %14d\n', s.id, s.z(1), p - 1, n_after(m), up - 1);
end
n_cut = floor(median(n_after));
fprintf('frames after the last push: median %d, range %d to %d\n', ...
        n_cut, min(n_after), max(n_after));

% the training arcs: do they run 15 frames past the crossing, as the header says,
% and does the ball bounce before the crossing the frames record?
d = load_shots('train');
train = d.shots;
fprintf('\n');
bounced = [];
for m = 1:numel(train)
    s = train(m);
    z = s.z;
    [~, top] = max(z);
    below = top - 1 + find(z(top:end) < rim, 1);    % first frame under the rim after the top
    if numel(z) - below + 1 ~= 15
        fprintf('arc %d: %d frames from the crossing to the end, not 15\n', s.id, numel(z) - below + 1);
    end
    if any(diff(z(near_hoop_end(s, NEAR_HOOP):below-1)) > 0)
        bounced(end+1) = s.id;          % the height rises again before it reaches the rim
    end
end
fprintf('%d of %d arcs rise again between 1 m out and the crossing:', numel(bounced), numel(train));
fprintf(' %d', bounced);
fprintf('\n');

% the method on the training arcs, cut to n_cut frames after the last push
fprintf('\n');
fprintf('training arcs cut to %d frames after the last push, against the whole flight\n', n_cut);
fprintf('%5s %5s %7s %6s %7s %6s %9s\n', 'arc', 'made', 't whole', 't cut', ...
        'd whole', 'd cut', 'place err');
t_err = [];
p_err = [];
t_err_free = [];
p_err_free = [];
d_cut = [];
made = [];
for m = 1:numel(train)
    s = train(m);
    if any(SKIP == s.id)
        continue
    end
    p = last_push(s.t, s.z, WINDOW);
    if isempty(p)
        p = floor(WINDOW / 2);    % no push found: start where the first estimate is
    end
    whole = predict(s, p + 1, near_hoop_end(s, NEAR_HOOP), rim, true, G, TOL_T);
    cut = predict(s, p + 1, p + n_cut, rim, true, G, TOL_T);
    free = predict(s, p + 1, p + n_cut, rim, false, G, TOL_T);
    err = hypot(cut(2) - whole(2), cut(3) - whole(3));
    t_err(end+1) = cut(1) - whole(1);
    p_err(end+1) = err;
    if ~isempty(free)
        t_err_free(end+1) = free(1) - whole(1);
        p_err_free(end+1) = hypot(free(2) - whole(2), free(3) - whole(3));
    end
    d_cut(end+1) = hypot(cut(2), cut(3));
    made(end+1) = s.pbp_made;
    fprintf('%5d %5s %7.3f %6.3f %7.3f %6.3f %9.3f\n', s.id, true_false(s.pbp_made), ...
            whole(1), cut(1), hypot(whole(2), whole(3)), d_cut(end), err);
end
margin = median(p_err);
fprintf(['held:   time error median %.3f s, worst %.3f s; ' ...
         'place error median %.3f m, worst %.3f m\n'], ...
        median(abs(t_err)), max(abs(t_err)), margin, max(p_err));
fprintf(['fitted: time error median %.3f s, worst %.3f s; ' ...
         'place error median %.3f m, worst %.3f m (%d arcs with a crossing)\n'], ...
        median(abs(t_err_free)), max(abs(t_err_free)), median(p_err_free), ...
        max(p_err_free), numel(p_err_free));

% how the calls compare with the play-by-play, with and without the margin
words = {'in', 'out', 'too close'};
for mg = [0.0, margin]
    fprintf('margin %.3f m:', mg);
    for w = 1:numel(words)
        hits = [];
        for k = 1:numel(d_cut)
            if strcmp(call_shot(d_cut(k), in_r, out_r, mg), words{w})
                hits(end+1) = k;
            end
        end
        fprintf('  %s %d (%d made)', words{w}, numel(hits), sum(made(hits)));
    end
    fprintf('\n');
end

% the twelve short records
fprintf('\n');
fprintf('short records, frames from the last push + 1 to the end, margin %.3f m\n', margin);
fprintf('%5s %6s %15s %7s %10s %7s %7s %6s %5s  call\n', 'shot', 'frames', ...
        'steps not 40 ms', 't cross', 'after last', 'x', 'y', 'd', 'evals');
rows = zeros(0, 4);
for m = 1:numel(short.shots)
    s = short.shots(m);
    t = s.t;
    z = s.z;
    p = last_push(t, z, WINDOW);
    pr = predict(s, p + 1, numel(t), rim, true, G, TOL_T);
    tc = pr(1);
    c = fit_height(t(p+1:end), z(p+1:end), true, G);
    r = roots([c(3), c(2), c(1) - rim]);           % the quadratic formula, as a check
    assert(abs(max(r) - tc) < TOL_T);
    dd = hypot(pr(2), pr(3));
    word = call_shot(dd, in_r, out_r, margin);
    steps = 1000 * diff(t(p+1:end));                % ms between the fitted frames
    odd = sum(abs(steps - 40) > 5);
    rows(end+1, :) = [s.id, pr(2), pr(3), dd];
    fprintf('%5d %6d %15d %7.3f %8.3f s %7.3f %7.3f %6.3f %5d  %s\n', s.id, ...
            numel(t) - p, odd, tc, tc - t(end), pr(2), pr(3), dd, pr(4), word);
end

% Figure 1: one short record, what is in it, and the crossing it predicts
s = find_shot(short.shots, SHOW);
t = s.t;
z = s.z;
p = last_push(t, z, WINDOW);
c = fit_height(t(p+1:end), z(p+1:end), true, G);
pr = predict(s, p + 1, numel(t), rim, true, G, TOL_T);
tc = pr(1);
tt = linspace(t(p+1), tc + 0.1, 200);
fig = figure('Position', [100 100 700 550]);
subplot(2, 1, 1);
plot(t(1:p), z(1:p), 'o', 'Color', [0.5 0.5 0.5]);
hold on
plot(t(p+1:end), z(p+1:end), 'ko', 'MarkerFaceColor', 'k');
plot(tt, c(1) + c(2) * tt + c(3) * tt.^2, '-');
yline(rim, '--r');
plot(tc, rim, 'rx', 'MarkerSize', 9);
ylabel('ball height (m)');
title(sprintf('Short record %d: the frames, and the parabola fitted to its flight', SHOW));
legend({'in the hand', 'frames fitted', 'parabola, g held at 9.81', 'rim height', ...
        sprintf('falling crossing, %.2f s', tc)}, 'Location', 'northwest');
subplot(2, 1, 2);
plot(t, accel(t, z, WINDOW), '.-');
hold on
yline(0, '-', 'Color', [0.5 0.5 0.5]);
yline(-G, ':g');
xline(t(p), '--', 'Color', [0.5 0.5 0.5]);
ylabel('vertical acceleration (m/s^2)');
xlabel('time from first frame (s)');
title('Vertical acceleration, 9-frame parabola at each frame');
saveas(fig, 'short_record.svg');
close(fig);

% Figure 2: the training check, time and place errors per arc
fig = figure('Position', [100 100 900 380]);
subplot(1, 2, 1);
hist(1000 * t_err, 10);
xlabel('time error, cut minus whole (ms)');
ylabel('number of arcs');
title(sprintf('Crossing time, %d training arcs', numel(t_err)));
subplot(1, 2, 2);
hist(100 * p_err, 10);
hold on
xline(100 * margin, '--k');
xlabel('distance between the two crossing points (cm)');
title('Crossing place');
saveas(fig, 'training_check.svg');
close(fig);

% Figure 3: where the twelve are predicted to come down, seen from above
fig = figure('Position', [100 100 600 600]);
ang = linspace(0, 2 * pi, 200);
plot(in_r * cos(ang), in_r * sin(ang), 'g');
hold on
plot(out_r * cos(ang), out_r * sin(ang), 'r');
plot((out_r + margin) * cos(ang), (out_r + margin) * sin(ang), 'r:');
for m = 1:size(rows, 1)
    plot(rows(m, 2), rows(m, 3), 'ko');
    text(rows(m, 2), rows(m, 3), ['  ' num2str(rows(m, 1))], 'FontSize', 7);
end
axis equal
xlabel('along the court from the hoop center (m)');
ylabel('across the court from the hoop center (m)');
title('Predicted crossing points, 12 short records');
legend({'in radius', 'out radius', sprintf('out radius + margin (%.2f m)', margin)}, ...
       'Location', 'southeast');
saveas(fig, 'predictions.svg');
close(fig);


function d = load_shots(name)
    d = jsondecode(fileread(['shots/' name '.json']));
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
    % The last frame before the top where the acceleration is upward, meaning
    % the hand is still on the ball. Empty if there is no such frame.
    a = accel(t, z, WINDOW);
    [~, top] = max(z);
    last = [];
    for i = 1:top-1
        if a(i) > 0
            last = i;
        end
    end
end


function c = fit_height(t, z, held, G)
    % Parabola z = c0 + c1 t + c2 t^2, with c2 = -g/2 when gravity is held.
    if held
        A = [ones(size(t)), t];
        c2 = A \ (z + 0.5 * G * t.^2);
        c = [c2(1); c2(2); -G / 2];
        return
    end
    A = [ones(size(t)), t, t.^2];
    c = A \ z;
end


function b = fit_line(t, v)
    % Straight line v = b0 + b1 t (no drag, so the floor speed is constant).
    A = [ones(size(t)), t];
    b = A \ v;
end


function f = above_rim(c, t, rim)
    % f(t): how far the fitted ball is above rim height at time t.
    f = c(1) + c(2) * t + c(3) * t^2 - rim;
end


function [root, evals] = falling_crossing(c, rim, TOL_T)
    % Bisection on f between the top of the parabola and 2 s after it. The
    % parabola is above the rim at its top and only falls after it, so the one
    % root in that bracket is the falling crossing.
    a = -c(2) / (2 * c(3));        % time of the top
    b = a + 2.0;
    fa = above_rim(c, a, rim);
    fb = above_rim(c, b, rim);
    root = [];
    evals = 2;
    if fa <= 0 || fb >= 0
        return                     % the fitted ball never gets above the rim
    end
    while b - a > TOL_T
        m = (a + b) / 2;
        fm = above_rim(c, m, rim);
        evals = evals + 1;
        if fm > 0
            a = m;                 % still above the rim, so the root is later
        else
            b = m;
        end
    end
    root = (a + b) / 2;
end


function pr = predict(s, first, last, rim, held, G, TOL_T)
    % Fit frames first..last of shot s. Returns [crossing time, x and y from the
    % hoop center (m), evaluations], or empty if there is no crossing.
    t = s.t(first:last);
    c = fit_height(t, s.z(first:last), held, G);
    [tc, evals] = falling_crossing(c, rim, TOL_T);
    pr = [];
    if isempty(tc)
        return
    end
    bx = fit_line(t, s.x(first:last) - s.hoop_x);
    by = fit_line(t, s.y(first:last) - s.hoop_y);
    pr = [tc, bx(1) + bx(2) * tc, by(1) + by(2) * tc, evals];
end


function word = call_shot(d, in_r, out_r, margin)
    % In, out or too close, with the bands narrowed by the margin.
    if d + margin < in_r
        word = 'in';
    elseif d - margin > out_r
        word = 'out';
    else
        word = 'too close';
    end
end


function e = near_hoop_end(s, NEAR_HOOP)
    % Last frame at least NEAR_HOOP from the hoop, measured across the floor.
    dist = hypot(s.x - s.hoop_x, s.y - s.hoop_y);
    e = find(dist < NEAR_HOOP, 1) - 1;
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


function w = true_false(x)
    % Python prints a yes/no value as True or False, so the MATLAB version does too.
    if x
        w = 'True';
    else
        w = 'False';
    end
end
