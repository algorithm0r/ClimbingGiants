% Assignment 5: model selection for the shot-flight model (MATLAB version).
%
% The same program as a5_model_selection.py, written for MATLAB. Run it from the
% unzipped pack folder. It compares two models of the ball's height in free flight,
%
%     free:   z = c0 + c1 t + c2 t^2           (c2 fitted, so gravity is fitted)
%     fixed:  z = c0 + c1 t - (g/2) t^2        (g held at 9.81 m/s^2)
%
% on every training arc. Each model is fitted to the first 6, 10 and 14 frames of
% the flight and scored on the rest of the flight, which it did not see. It prints
% the release frames, the frames of flight in the test records, a line per arc
% and a summary table, and saves release.svg, errors_by_window.svg and arc_325.svg.
%
% MATLAB counts from 1 and Python from 0. The printed frame numbers subtract 1, so
% they are the same frame numbers the report (and the Python program) give.

G = 9.81;               % m/s^2
WINDOW = 9;             % frames in each acceleration estimate (0.32 s)
TOL = 5.0;              % m/s^2, how close to -g counts as "settled"
RUN = 4;                % frames in a row it has to stay settled
RIM = 3.048;            % m, rim height (from the header)
FIT_LENGTHS = [6, 10, 14];
MIN_HELD_OUT = 3;       % an arc needs at least this many unseen frames to be scored

train = load_shots('train');
shots = train.shots;
noise = train.header.tracking_noise.vertical_m;
fprintf('vertical tracking noise from the header (m): %g\n', noise);

% how much flight does a test record give us to fit?
names = {'test_short', 'test_mid', 'test_long'};
for k = 1:numel(names)
    d = load_shots(names{k});
    test_shots = d.shots;
    seen = zeros(numel(test_shots), 1);
    for m = 1:numel(test_shots)
        t = test_shots(m).t;
        z = test_shots(m).z;
        seen(m) = numel(t) - last_push(t, z, WINDOW);
    end
    fprintf('%-10s  frames after the last upward push: median %.0f, range %d to %d\n', ...
            names{k}, median(seen), min(seen), max(seen));
end

% find the flight in every training arc
arc_ids = [];
arc_t = {};
arc_z = {};
fprintf('\n');
fprintf('%5s %7s %4s %6s %16s\n', 'arc', 'release', 'end', 'frames', 'steps not 40 ms');
odd_steps = [];
for m = 1:numel(shots)
    s = shots(m);
    t = s.t;
    z = s.z;
    gap = straight_runs(z, 6);
    if ~isempty(gap)
        fprintf('%5d  dropped: height is a straight line, frames %d to %d\n', ...
                s.id, gap(1) - 1, gap(2) - 1);
        continue
    end
    r = release(t, z, WINDOW, G, TOL, RUN);
    e = flight_end(t, z, WINDOW, G, TOL, RUN, RIM);
    steps = 1000 * diff(t(r:e));           % ms between frames in the flight
    odd = steps(abs(steps - 40) > 5);
    odd_steps = [odd_steps; odd];
    fprintf('%5d %7d %4d %6d %16d\n', s.id, r - 1, e - 1, e - r + 1, numel(odd));
    arc_ids(end+1) = s.id;
    arc_t{end+1} = t(r:e);
    arc_z{end+1} = z(r:e);
end

fprintf('steps other than 40 ms inside the flights: %d, from %.0f to %.0f ms\n', ...
        numel(odd_steps), min(odd_steps), max(odd_steps));

% both models, three fit lengths, scored on the unseen part of the flight
results = cell(1, numel(FIT_LENGTHS));
for k = 1:numel(FIT_LENGTHS)
    n_fit = FIT_LENGTHS(k);
    rows = [];
    for m = 1:numel(arc_t)
        t = arc_t{m};
        z = arc_z{m};
        if numel(t) - n_fit < MIN_HELD_OUT
            continue
        end
        tf = t(1:n_fit);          % the fitted frames
        zf = z(1:n_fit);
        th = t(n_fit+1:end);      % the held-out frames
        zh = z(n_fit+1:end);
        free = fit(tf, zf, false, G);
        fixed = fit(tf, zf, true, G);
        rows(end+1, :) = [rms_error(free, tf, zf), rms_error(fixed, tf, zf), ...
                          rms_error(free, th, zh), rms_error(fixed, th, zh), -2 * free(3)];
    end
    % residuals and errors to cm, g stays in m/s^2
    results{k} = rows .* [100, 100, 100, 100, 1];
end

% the summary, one block of lines per fit length
fprintf('\n');
for k = 1:numel(FIT_LENGTHS)
    r = results{k};
    med = median(r, 1);
    fprintf('%d frames fitted, %d arcs (medians over the arcs)\n', FIT_LENGTHS(k), size(r, 1));
    fprintf('  residual (cm):     free %.2f  fixed %.2f  free <= fixed on %d\n', ...
            med(1), med(2), sum(r(:, 1) <= r(:, 2)));
    fprintf('  held-out (cm):     free %.1f  fixed %.1f  fixed closer on %d\n', ...
            med(3), med(4), sum(r(:, 4) < r(:, 3)));
    fprintf('  fitted g (m/s^2):  %.2f, range %.1f to %.1f\n', ...
            med(5), min(r(:, 5)), max(r(:, 5)));
end

% whole flights, gravity fitted
g_whole = zeros(numel(arc_t), 1);
for m = 1:numel(arc_t)
    c = fit(arc_t{m}, arc_z{m}, false, G);
    g_whole(m) = -2 * c(3);
end
fprintf('\n');
fprintf('g fitted to whole flights: median %.2f, range %.2f to %.2f m/s^2, %d arcs\n', ...
        median(g_whole), min(g_whole), max(g_whole), numel(g_whole));

% Figure 1: how the release is found, on one arc
s = find_shot(shots, 1223);
t = s.t;
z = s.z;
a = accel(t, z, WINDOW);
r = release(t, z, WINDOW, G, TOL, RUN);
e = flight_end(t, z, WINDOW, G, TOL, RUN, RIM);
fig = figure('Position', [100 100 700 550]);
subplot(2, 1, 1);
plot(t, z, '.', 'Color', [0.5 0.5 0.5]);
hold on
plot(t(r:e), z(r:e), 'k.');
xline(t(r), '--r');
xline(t(e), '--b');
ylabel('ball height (m)');
title('Arc 1223: height, and the free flight found in it (black)');
legend({'all frames', 'free flight', sprintf('release (frame %d)', r - 1), ...
        sprintf('end of flight (frame %d)', e - 1)}, 'Location', 'northwest');
subplot(2, 1, 2);
plot(t, a, '.-');
hold on
yline(-G - TOL, ':g');
yline(-G + TOL, ':g');
yline(0, '-', 'Color', [0.5 0.5 0.5]);
xline(t(r), '--r');
xline(t(e), '--b');
ylabel('vertical acceleration (m/s^2)');
xlabel('time from first frame (s)');
title('Vertical acceleration, 9-frame parabola at each frame');
saveas(fig, 'release.svg');
close(fig);

% Figure 2: residual and held-out error against frames fitted
fig = figure('Position', [100 100 900 380]);
labels = {'gravity fitted', 'gravity held at 9.81'};
marks = {'o-', 's-'};
for col = 1:2
    resid = zeros(1, numel(FIT_LENGTHS));
    held_out = zeros(1, numel(FIT_LENGTHS));
    for k = 1:numel(FIT_LENGTHS)
        resid(k) = median(results{k}(:, col));
        held_out(k) = median(results{k}(:, col + 2));
    end
    subplot(1, 2, 1);
    plot(FIT_LENGTHS, resid, marks{col});
    hold on
    subplot(1, 2, 2);
    plot(FIT_LENGTHS, held_out, marks{col});
    hold on
end
titles = {'Residual on the fitted frames', 'Error on the unseen frames'};
for col = 1:2
    subplot(1, 2, col);
    title(titles{col});
    xlabel('frames fitted (25 per second)');
    ylabel('median rms height error (cm)');
    xticks(FIT_LENGTHS);
    legend(labels);
end
saveas(fig, 'errors_by_window.svg');
close(fig);

% Figure 3: the filled gap in arc 325
s = find_shot(shots, 325);
t = s.t;
z = s.z;
gap = straight_runs(z, 6);
lo = gap(1);
hi = gap(2);
fig = figure('Position', [100 100 700 350]);
plot(t, z, '.-', 'Color', [0.5 0.5 0.5], 'LineWidth', 0.6);
hold on
plot(t(lo:hi), z(lo:hi), 'r.');
title('Arc 325: ball height, with a stretch the tracker filled in');
xlabel('time from first frame (s)');
ylabel('ball height (m)');
legend({'ball height', sprintf('straight lines, frames %d to %d', lo - 1, hi - 1)});
saveas(fig, 'arc_325.svg');
close(fig);


function d = load_shots(name)
    d = jsondecode(fileread(['shots/' name '.json']));
    if iscell(d.shots)
        % jsondecode gives a cell array when the shots do not all have the same
        % fields (some carry an extra one). Keep the three fields used here.
        cells = d.shots;
        d.shots = struct('id', {}, 't', {}, 'z', {});
        for m = 1:numel(cells)
            d.shots(m).id = cells{m}.id;
            d.shots(m).t = cells{m}.t;
            d.shots(m).z = cells{m}.z;
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


function r = release(t, z, WINDOW, G, TOL, RUN)
    % The first frame after the last upward push at which the acceleration is
    % within TOL of -g and stays there for RUN frames. Empty if it never does.
    a = accel(t, z, WINDOW);
    p = last_push(t, z, WINDOW);
    if ~isempty(p)
        first = p + 1;
    else
        first = floor(WINDOW / 2) + 1;
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
    % Last frame of the flight: the frame before the acceleration leaves the
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


function gap = straight_runs(z, frames)
    % First and last frame of any stretch where the height falls on a straight
    % line for 'frames' steps or more. Measured heights carry about 3 cm of noise,
    % so a straight line means the tracker filled a gap. Empty if there is none.
    flat = abs(diff(z, 2)) < 0.001;
    hits = [];
    for i = 1:numel(flat)-frames+2
        if all(flat(i:i+frames-2))
            hits(end+1) = i;
        end
    end
    gap = [];
    if ~isempty(hits)
        gap = [hits(1), hits(end) + frames];
    end
end


function c = fit(t, z, fixed, G)
    if fixed   % the known term moves to the left-hand side
        A = [ones(size(t)), t];
        c2 = A \ (z + 0.5 * G * t.^2);
        c = [c2(1); c2(2); -G / 2];
        return
    end
    A = [ones(size(t)), t, t.^2];
    c = A \ z;
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


function e = rms_error(c, t, z)
    e = sqrt(mean((c(1) + c(2) * t + c(3) * t.^2 - z).^2));
end
