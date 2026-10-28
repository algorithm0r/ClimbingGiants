% Assignment 7: occupant travel relative to the car, with a step study (MATLAB version).
%
% The same program as a7_occupant_model.py, written for MATLAB. Run it from the
% unzipped pack folder. Model: one mass (the occupant) on a spring and damper (the
% belt), driven by the car's acceleration,
%
%     m u'' + c u' + k u = -m a_car(t)
%
% with u the travel relative to the car (forward positive). The state (u, w = u')
% is stepped with classical RK4. a_car is the crossmember channel filtered at
% CFC 180, the class J211 gives a structural acceleration that will be
% integrated, and between samples it is a straight line between neighbors.
%
% Prints a table of travel against step for the filtered and the raw drive,
% picks the step, then runs three checks. Saves travel.svg, drive.svg,
% steps.svg and chest_check.svg.

M = 75.0;        % occupant mass, kg
K = 296000.0;    % belt stiffness, N/m
C = 2800.0;      % belt damping, N*s/m
G = 9.81;        % m/s^2 per g
V0 = 15.60;      % approach speed, m/s (56.15 km/h from the test record)
SETTLED = 0.001; % mm, a hundredth of the 0.1 mm I quote (RK4 makes this cheap)

files = dir(fullfile('crash', '*.json'));
test = jsondecode(fileread(fullfile('crash', files(1).name)));
ch = test.channels.vehicle_x;
dt = ch.dt;
t = ch.t0 + dt * (0:ch.n-1)';
raw = ch.y;
a180 = cfc(raw, dt, 180);
fprintf('drive: %s [%s], %d samples every %g ms\n', ch.comment, ch.code, ch.n, 1000 * dt);
[low_raw, i_raw] = min(raw);
[low_180, i_180] = min(a180);
fprintf('peak raw %.1f g at %.2f ms, CFC 180 %.1f g at %.2f ms\n', ...
        low_raw / G, 1000 * t(i_raw), low_180 / G, 1000 * t(i_180));
fn = sqrt(K / M) / (2 * pi);
fprintf('belt natural frequency %.2f Hz (period %.0f ms), damping ratio %.3f\n', ...
        fn, 1000 / fn, C / (2 * sqrt(K * M)));

% ---- step study: halve from 6.4 ms (128 samples) down to 0.025 ms (half a sample)
steps = 128 * dt ./ 2.^(0:8);
drives = {a180, raw};
results = zeros(numel(steps), 2);        % one column per drive
fprintf('\n%10s %12s %9s %10s %9s\n', 'step (ms)', 'CFC 180 (mm)', 'change', ...
        'raw (mm)', 'change');
for k = 1:numel(steps)
    h = steps(k);
    row = sprintf('%10.4f', 1000 * h);
    for d = 1:2
        [x, at] = travel(t, drives{d}, h, M, K, C);
        results(k, d) = x;
        if k == 1
            row = [row, sprintf(' %12.4f %9s', x, '')];
        else
            row = [row, sprintf(' %12.4f %+9.4f', x, x - results(k-1, d))];
        end
    end
    disp(row);
end

% the step: the largest one where the next TWO halvings each move the CFC 180
% travel less than SETTLED (a single small change can be luck)
s180 = results(:, 1);
for k = 1:numel(steps) - 2
    first_change = abs(s180(k+1) - s180(k));
    second_change = abs(s180(k+2) - s180(k+1));
    if first_change < SETTLED && second_change < SETTLED
        break                      % k is the step chosen
    end
end
h = steps(k);
fprintf('\nchosen step %.2f ms (%.0f samples), step x natural frequency %.3f\n', ...
        1000 * h, h / dt, h * sqrt(K / M));
fprintf('the next two halvings move the travel %+.4f and %+.4f mm\n', ...
        s180(k+1) - s180(k), s180(k+2) - s180(k+1));

[times, u, w] = rk4(t, a180, h, M, K, C);
[top, i] = max(u);
when = times(i);
[~, j] = min(u);
fprintf('TRAVEL %.2f mm at %.1f ms\n', 1000 * top, 1000 * when);
fprintf('most negative travel %.1f mm at %.1f ms, at the end of the record %.1f mm\n', ...
        1000 * u(j), 1000 * times(j), 1000 * u(end));

% ---- checks
fprintf('\nchecks\n');
fprintf('1. the drive filtered three ways, all at the record''s own step:\n');
check_names = {'CFC 180', 'CFC 60', 'raw'};
check_drives = {a180, cfc(raw, dt, 60), raw};
for d = 1:3
    [x, at] = travel(t, check_drives{d}, dt, M, K, C);
    fprintf('   %-8s %.4f mm at %.2f ms\n', check_names{d}, x, at);
end
dv = sum((raw(2:end) + raw(1:end-1)) / 2) * dt;
fprintf('2. velocity change in the drive %.2f m/s against an approach of %.2f m/s, rebound %.2f m/s\n', ...
        dv, V0, -dv - V0);
a_occ = -(K * u + C * w) / M;                    % occupant's own acceleration, m/s^2
chest = cfc(test.channels.chest_x.y, dt, 180);
[~, io] = min(a_occ);
[~, ic] = min(chest);
fprintf('3. model occupant peak %.1f g at %.1f ms, driver chest (CFC 180) %.1f g at %.1f ms\n', ...
        a_occ(io) / G, 1000 * times(io), chest(ic) / G, 1000 * t(ic));
% after the peak the model's spring pushes back. Does the chest show that?
[~, io] = max(a_occ);
[~, ic] = max(chest);
fprintf('   largest push back: model %+.1f g at %.1f ms, chest %+.1f g at %.1f ms\n', ...
        a_occ(io) / G, 1000 * times(io), chest(ic) / G, 1000 * t(ic));

% ---- figure 1, travel against time
fig = figure('Position', [100 100 700 400]);
plot(1000 * times, 1000 * u);
hold on
plot(1000 * when, 1000 * top, 'o', 'Color', [0.84 0.15 0.16]);
text(1000 * when, 1000 * top, sprintf('   %.1f mm at %.1f ms', 1000 * top, 1000 * when));
ylim([-60 130]);
yline(0, 'Color', [0.5 0.5 0.5]);
xlabel('time from impact (ms)');
ylabel('occupant travel relative to the car (mm)');
title(sprintf('Occupant travel, RK4 at %.1f ms, CFC 180 drive', 1000 * h));
saveas(fig, 'travel.svg');
close(fig);

% ---- figure 2, the drive as recorded and filtered
fig = figure('Position', [100 100 700 400]);
plot(1000 * t, raw / G, 'LineWidth', 0.6);
hold on
plot(1000 * t, a180 / G);
xlim([-10 150]);
xlabel('time from impact (ms)');
ylabel('acceleration (g)');
title('Crossmember X acceleration [10SEATLERE00ACXP]');
legend({'as recorded', 'CFC 180'});
saveas(fig, 'drive.svg');
close(fig);

% ---- figure 3, the step study
fig = figure('Position', [100 100 700 400]);
semilogx(1000 * steps, results(:, 1), 'o-');
hold on
semilogx(1000 * steps, results(:, 2), 's--');
yl = ylim;                               % vertical lines from the bottom to the top
plot([1000 * dt, 1000 * dt], yl, ':', 'Color', [0.5 0.5 0.5]);
plot([1000 * h, 1000 * h], yl, ':r');
ylim(yl);
xlabel('step (ms)');
ylabel('largest travel (mm)');
title('Largest occupant travel against RK4 step');
legend({'CFC 180 drive', 'raw drive', 'record sample interval', 'step used'});
saveas(fig, 'steps.svg');
close(fig);

% ---- figure 4, the model against the chest
fig = figure('Position', [100 100 700 400]);
plot(1000 * t, chest / G);
hold on
plot(1000 * times, a_occ / G);
xlim([-10 200]);
xlabel('time from impact (ms)');
ylabel('acceleration (g)');
title('Occupant acceleration: model against the dummy chest');
legend({'driver chest X, measured (CFC 180)', 'model occupant'});
saveas(fig, 'chest_check.svg');
close(fig);


function out = cfc(y, dt, cls)
    % SAE J211-1 Butterworth, forward then backward (assignment 4).
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
        out(i) = c(1)*x(i) + c(2)*x(i-1) + c(3)*x(i-2) + c(4)*out(i-1) + c(5)*out(i-2);
    end
end


function [du, dw] = rate(time, u, w, t, a_car, M, K, C)
    % The rate of the state (u, w) at one time.
    a = interp1(t, a_car, min(time, t(end)));   % straight line between samples, last value past the end
    du = w;
    dw = (-C * w - K * u) / M - a;
end


function [times, u, w] = rk4(t, a_car, h, M, K, C)
    % Step the state (u, w) from rest at t(1) to the end of the record with RK4.
    % Returns the step times, u and w.
    n_steps = round((t(end) - t(1)) / h);
    times = t(1) + h * (0:n_steps)';
    u = zeros(n_steps + 1, 1);
    w = zeros(n_steps + 1, 1);
    for n = 1:n_steps
        tn = times(n);
        un = u(n);
        wn = w(n);
        [k1u, k1w] = rate(tn, un, wn, t, a_car, M, K, C);
        [k2u, k2w] = rate(tn + h/2, un + h/2 * k1u, wn + h/2 * k1w, t, a_car, M, K, C);
        [k3u, k3w] = rate(tn + h/2, un + h/2 * k2u, wn + h/2 * k2w, t, a_car, M, K, C);
        [k4u, k4w] = rate(tn + h, un + h * k3u, wn + h * k3w, t, a_car, M, K, C);
        u(n+1) = un + h/6 * (k1u + 2*k2u + 2*k3u + k4u);
        w(n+1) = wn + h/6 * (k1w + 2*k2w + 2*k3w + k4w);
    end
end


function [x, at] = travel(t, a_car, h, M, K, C)
    % Largest forward travel (mm) and when it happens (ms), at step h. This is
    % the largest value on the step grid, so it can only be at or below the true
    % peak; the step study shows how much that matters.
    [times, u, ~] = rk4(t, a_car, h, M, K, C);
    [top, i] = max(u);
    x = 1000 * top;
    at = 1000 * times(i);
end
