% Assignment 3: impact speed and crush distance from the crossmember accelerometer
% (MATLAB version).
%
% The same program as a3_velocity_and_crush.py, written for MATLAB. Run this from
% the unzipped pack folder. It prints every number in the report (the comparison
% with the lab's speed, the crush, and the table of processing choices) and saves
% the three figures:
%     fig1_acceleration.svg   the channel with its pre-contact offset removed
%     fig2_delta_v.svg        change in velocity since contact, constant set to zero
%     fig3_velocity_crush.svg velocity with the lab's speed added, and distance

G = 9.81;  % m/s^2 in one g

test = load_test('.');
ch = test.channels.vehicle_x;          % V1 LEFT REAR SEAT CROSSMEMBER AX
dt = ch.dt;
t = ch.t0 + dt * (0:ch.n-1)';
raw = ch.y;
lab = test.test.speed_kph / 3.6;

fprintf('channel %s: %s, %d samples every %g s\n', ch.code, ch.comment, ch.n, dt);
fprintf('lab speed %g km/h = %.2f m/s\n', test.test.speed_kph, lab);

before = raw(t < 0);
fprintf('before contact: mean %.3f m/s^2, standard deviation %.3f m/s^2\n', ...
        mean(before), std(before, 1));

r = analyse(raw, t, dt, lab);
peak = r.peak;
stop = r.stop;
fprintf('largest change in velocity %.2f m/s at %.1f ms  (gap to lab %.2f m/s, %.1f%%)\n', ...
        -r.dv(peak), 1000 * t(peak), -r.dv(peak) - lab, 100 * (-r.dv(peak) - lab) / lab);
fprintf('change over the whole record %.2f m/s  (gap to lab %.2f m/s, %.1f%%)\n', ...
        -r.dv(end), -r.dv(end) - lab, 100 * (-r.dv(end) - lab) / lab);
after = (t > t(peak)) & (t <= 0.15);
fprintf('mean acceleration from %.1f to 150 ms: %.2f g\n', 1000 * t(peak), mean(r.a(after)) / G);
fprintf('mean acceleration over the last 50 ms: %.3f m/s^2\n', mean(r.a(t > 0.25)));
fprintf('stopped at %.1f ms, crush %.0f mm\n', 1000 * t(stop), 1000 * r.crush);
fprintf('velocity at end of record %.2f m/s\n', r.v(end));

% how much each processing choice moves the answers
fprintf('\n');
fprintf('%-9s %-10s %8s %7s %8s %9s\n', 'baseline', 'rule', 'dv peak', 'dv end', ...
        'stop ms', 'crush mm');
baselines = [true, false, true];
rules = {'trapezoid', 'trapezoid', 'rectangle'};
for m = 1:3
    s = analyse(raw, t, dt, lab, baselines(m), rules{m});
    if baselines(m)
        label = 'yes';
    else
        label = 'no';
    end
    fprintf('%-9s %-10s %8.2f %7.2f %8.1f %9.0f\n', label, rules{m}, -s.dv(s.peak), ...
            -s.dv(end), 1000 * t(s.stop), 1000 * s.crush);
end

% how much the constant moves the crush
fprintf('\n');
for c = [lab - 0.1, lab + 0.1, -r.dv(end)]
    s = analyse(raw, t, dt, c);
    fprintf('constant %.2f m/s: stop %.1f ms, crush %.0f mm\n', c, 1000 * t(s.stop), ...
            1000 * s.crush);
end

t_ms = 1000 * t;

% Figure 1: the channel in g, offset removed
fig = figure('Position', [100 100 700 360]);
plot(t_ms, r.a / G, 'LineWidth', 0.7);
xline(0, '--', 'Color', [0.5 0.5 0.5]);
xlim([-20 160]);
xlabel('time from contact (ms)');
ylabel('acceleration (g)');
title('Left rear seat crossmember, X acceleration [10SEATLERE00ACXP]');
legend({'as recorded, offset removed'}, 'Location', 'southeast');
saveas(fig, 'fig1_acceleration.svg');
close(fig);

% Figure 2: change in velocity, constant set to zero
fig = figure('Position', [100 100 700 360]);
plot(t_ms, r.dv);
hold on
yline(-lab, '--', 'Color', [0.5 0.5 0.5]);
text(295, -lab + 0.6, sprintf('minus the lab''s speed, %.2f m/s', -lab), ...
     'HorizontalAlignment', 'right');
plot(t_ms(peak), r.dv(peak), 'o');
text(t_ms(peak) + 4, r.dv(peak) - 1.6, sprintf('%.2f m/s at %.1f ms', r.dv(peak), t_ms(peak)));
plot(t_ms(end), r.dv(end), 'o');
text(295, r.dv(end) - 0.8, sprintf('%.2f m/s at 300 ms', r.dv(end)), ...
     'HorizontalAlignment', 'right', 'VerticalAlignment', 'top');
ylim([-21 2]);
xlabel('time from contact (ms)');
ylabel('change in velocity (m/s)');
title('Change in velocity since contact (crossmember, constant = 0)');
saveas(fig, 'fig2_delta_v.svg');
close(fig);

% Figure 3: velocity with the lab's constant, and distance
fig = figure('Position', [100 100 700 600]);
subplot(2, 1, 1);
plot(t_ms, r.v);
hold on
yline(0, 'Color', [0.5 0.5 0.5]);
plot(t_ms(stop), 0, 'o');
text(t_ms(stop) + 4, 1.0, sprintf('zero at %.1f ms', t_ms(stop)));
xlim([-10 160]);
ylabel('velocity (m/s)');
title('(a) Velocity of the compartment, lab speed as the constant');
subplot(2, 1, 2);
plot(t_ms, 1000 * r.x);
hold on
plot(t_ms(stop), 1000 * r.crush, 'o');
text(t_ms(stop) + 4, 1000 * r.crush - 90, sprintf('%.0f mm', 1000 * r.crush));
ylim([-100 750]);
xlim([-10 160]);
xlabel('time from contact (ms)');
ylabel('distance since contact (mm)');
title('(b) Distance traveled toward the barrier');
saveas(fig, 'fig3_velocity_crush.svg');
close(fig);


function test = load_test(pack)
    files = dir(fullfile(pack, 'crash', '*.json'));   % the crash folder holds one file
    test = jsondecode(fileread(fullfile(pack, 'crash', files(1).name)));
end


function out = running_integral(y, dt, rule)
    % Cumulative integral with the leading zero, so it lines up with t.
    if strcmp(rule, 'trapezoid')
        panels = (y(2:end) + y(1:end-1)) / 2 * dt;
    else                                   % rectangle, left-hand sample
        panels = y(1:end-1) * dt;
    end
    out = [0; cumsum(panels)];
end


function r = analyse(a, t, dt, lab, baseline, rule)
    % Everything the report needs from one set of processing choices.
    if nargin < 5
        baseline = true;
    end
    if nargin < 6
        rule = 'trapezoid';
    end
    if baseline
        a = a - mean(a(t < 0));        % towed at constant speed before contact
    end
    i0 = find(t >= 0, 1);              % the first sample at or after contact
    dv = running_integral(a, dt, rule);
    dv = dv - dv(i0);                  % change since contact
    v = lab + dv;                      % the lab's speed is the constant
    stop = i0 - 1 + find(v(i0:end) <= 0, 1);  % the first sample after contact with v at or below 0
    x = running_integral(v, dt, rule);
    x = x - x(i0);
    [~, peak] = min(dv);
    r = struct('a', a, 'dv', dv, 'v', v, 'x', x, 'stop', stop, 'peak', peak, ...
               'crush', x(stop));
end
