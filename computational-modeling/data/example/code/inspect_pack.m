% Assignment 1: inspect the crash test in a data pack (MATLAB version).
%
% The same program as inspect_pack.py, written for MATLAB. Run this from the
% unzipped pack folder. It prints the test description and the largest value in
% each channel, and saves the figures used in the report: one per channel
% (channel_<key>.svg) and the chest displacement both ways (chest_d_units.svg).

G = 9.81;      % m/s^2 in one g
PACK = '.';    % the unzipped pack folder

test = load_test(PACK);
v = test.vehicle;
info = test.test;
fprintf('Test %d: %d %s %s, %s at %g km/h\n', test.testNo, v.year, v.make, v.model, ...
        info.config, info.speed_kph);

% the largest value in each channel, and when it happens
fprintf('%-36s %-8s %9s %6s %8s\n', 'description', 'unit', 'largest', 'in g', 'at (ms)');
keys = fieldnames(test.channels);
for m = 1:numel(keys)
    ch = test.channels.(keys{m});
    t = times_ms(ch);
    y = ch.y;
    i = 1;                               % index of the largest size so far
    for k = 1:numel(y)
        if abs(y(k)) > abs(y(i))
            i = k;
        end
    end
    if strcmp(ch.dimension, 'Acceleration')
        in_g = sprintf('%6.1f', y(i) / G);
    else
        in_g = '     -';
    end
    fprintf('%-36s %-8s %9.1f %s %8.1f\n', ch.comment, ch.unit, y(i), in_g, t(i));
end

% one figure per channel, labeled from its own header
for m = 1:numel(keys)
    key = keys{m};
    ch = test.channels.(key);
    y = ch.y;
    unit = ch.unit;
    dim = ch.dimension;
    if strcmp(key, 'chest_d')   % header says m and 'Meters', values are micrometers
        y = micrometers_to_mm(y);
        unit = 'mm';
        dim = 'Displacement';
    end
    fig = figure('Position', [100 100 500 300]);
    plot(times_ms(ch), y, 'LineWidth', 0.8);
    xline(0, '--', 'Color', [0.5 0.5 0.5]);
    title(sprintf('%s  [%s]', ch.comment, ch.code), 'FontSize', 9, 'Interpreter', 'none');
    xlabel('time from impact (ms)');
    ylabel(sprintf('%s (%s)', dim, unit));
    saveas(fig, sprintf('channel_%s.svg', key));
    close(fig);
end

% the chest displacement as labeled, and read as micrometers
ch = test.channels.chest_d;
fig = figure('Position', [100 100 1000 320]);
subplot(1, 2, 1);
plot(times_ms(ch), ch.y, 'Color', [0.84 0.15 0.16], 'LineWidth', 0.8);
title('as the header labels it');
ylabel('chest displacement (m, per header)');
xlabel('time from impact (ms)');
subplot(1, 2, 2);
plot(times_ms(ch), micrometers_to_mm(ch.y), 'LineWidth', 0.8);
title('read as micrometers, shown in mm');
ylabel('chest displacement (mm)');
xlabel('time from impact (ms)');
saveas(fig, 'chest_d_units.svg');
close(fig);


function test = load_test(pack)
    % The crash folder holds one file, the test.
    files = dir(fullfile(pack, 'crash', '*.json'));
    test = jsondecode(fileread(fullfile(pack, 'crash', files(1).name)));
end


function t = times_ms(ch)
    % The file stores no times. t0, dt and n give them, here in milliseconds.
    t = zeros(ch.n, 1);
    for i = 1:ch.n
        t(i) = 1000 * (ch.t0 + (i - 1) * ch.dt);
    end
end


function out = micrometers_to_mm(y)
    % Every value divided by 1000.
    out = zeros(size(y));
    for k = 1:numel(y)
        out(k) = y(k) / 1000;
    end
end
