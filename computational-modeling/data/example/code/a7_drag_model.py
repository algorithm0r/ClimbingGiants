"""Assignment 7: is quadratic drag worth adding to the shot-flight model?

Run this from the unzipped pack folder. For every training arc it finds the free
flight (the release and end rules from assignment 5) and takes a starting position
and velocity from a fit to the first 6, 10 or 14 frames of it. From there it steps
the flight forward with RK4 three ways: with no drag, and with quadratic drag at
each end of the range of k worked out on the notes page State as a vector. Each
stepped flight is scored on the frames the fit did not see, and on the measured rim
crossing where the ball reaches rim height before it touches anything. It prints
the drag constants, the step-size check, a line per arc and a summary, and saves
convergence.svg, one_arc.svg and errors.svg.
"""
import json

import numpy as np
import matplotlib.pyplot as plt

G = 9.81               # m/s^2
WINDOW = 9             # frames in each acceleration estimate (0.32 s)
TOL = 5.0              # m/s^2, how close to -g counts as free flight
RUN = 4                # frames in a row it has to stay that close
RIM = 3.048            # m, rim height (from the header)
FIT_LENGTHS = [6, 10, 14]
H = 0.04               # s, the step (one frame), chosen by the halving check below
SHOW = 662             # the arc drawn in one_arc.svg

# k = rho C_D A / (2 m), with the numbers given on the notes page State as a vector
RHO = 1.20             # kg/m^3, air at 20 C and sea-level pressure
CD_LOW = 0.30          # drag coefficient, low end of the wind-tunnel range
CD_HIGH = 0.40         # high end
MASS_LOW = 0.580       # kg, lightest ball the rules allow
MASS_HIGH = 0.620      # kg, heaviest


def load(name):
    with open(f'shots/{name}.json') as f:
        return json.load(f)


def accel(t, z):
    """Vertical acceleration at every frame, from a parabola through the 9 frames
    centered on it. NaN where the window runs off either end."""
    h = WINDOW // 2
    a = np.full(len(t), np.nan)
    for i in range(h, len(t) - h):
        c = np.polyfit(t[i - h:i + h + 1] - t[i], z[i - h:i + h + 1], 2)
        a[i] = 2 * c[0]
    return a


def release(t, z):
    """The first frame after the last upward push at which the acceleration is
    within TOL of -g and stays there for RUN frames."""
    a = accel(t, z)
    top = int(np.argmax(z))
    first = WINDOW // 2
    for i in range(top):
        if a[i] > 0:
            first = i + 1      # the hand is still pushing at frame i
    for i in range(first, len(t) - RUN + 1):
        if np.all(np.abs(a[i:i + RUN] + G) < TOL):
            return i
    return None


def flight_end(t, z):
    """Last frame of the free flight: the frame before the acceleration leaves the
    band for RUN frames in a row (the ball has hit something), or the frame
    before the ball drops through rim height, whichever comes first."""
    a = accel(t, z)
    top = int(np.argmax(z))
    for i in range(top, len(t) - RUN + 1):
        if np.all(np.abs(a[i:i + RUN] + G) >= TOL) or z[i] < RIM:
            return i - 1
    return len(t) - 1


def straight_run(z, frames=6):
    """True if the height falls on a straight line for 'frames' steps or more.
    Measured heights carry about 3 cm of noise, so a straight line means the
    tracker filled a gap."""
    flat = np.abs(np.diff(z, 2)) < 0.001
    for i in range(len(flat) - frames + 2):
        if np.all(flat[i:i + frames - 1]):
            return True
    return False


def start_state(t, x, y, z, first, n):
    """Position and velocity at the middle of n frames starting at 'first', from
    straight lines in x and y and a parabola in z with gravity held at 9.81.
    Time is measured from the middle of the fitted frames, so each fit's constant
    is the position there and its slope is the velocity there."""
    t_mid = np.mean(t[first:first + n])
    dt = t[first:first + n] - t_mid
    A = np.column_stack([np.ones_like(dt), dt])
    cx = np.linalg.lstsq(A, x[first:first + n], rcond=None)[0]
    cy = np.linalg.lstsq(A, y[first:first + n], rcond=None)[0]
    cz = np.linalg.lstsq(A, z[first:first + n] + 0.5 * G * dt ** 2, rcond=None)[0]
    return t_mid, np.array([cx[0], cy[0], cz[0], cx[1], cy[1], cz[1]])


def rate(s, drag_k):
    """The rate of the state s = [x, y, z, vx, vy, vz]. Drag acts against the
    velocity and grows with the speed squared, so every direction needs the speed."""
    vx = s[3]
    vy = s[4]
    vz = s[5]
    speed = np.sqrt(vx ** 2 + vy ** 2 + vz ** 2)
    return np.array([vx, vy, vz,
                     -drag_k * speed * vx,
                     -drag_k * speed * vy,
                     -G - drag_k * speed * vz])


def rk4_step(s, h, drag_k):
    k1 = rate(s, drag_k)
    k2 = rate(s + h / 2 * k1, drag_k)
    k3 = rate(s + h / 2 * k2, drag_k)
    k4 = rate(s + h * k3, drag_k)
    return s + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)


def step_to(s, t_from, t_to, drag_k, h_max):
    """Step the state from t_from to t_to in equal steps no longer than about
    h_max, so that the last step lands exactly on t_to."""
    n = max(1, int(np.floor((t_to - t_from) / h_max + 0.5)))
    h = (t_to - t_from) / n
    for i in range(n):
        s = rk4_step(s, h, drag_k)
    return s


def unseen_error(t, x, y, z, first, last, t_mid, s, drag_k):
    """rms distance (m) between the stepped ball and the measured ball over
    frames first .. last."""
    t_now = t_mid
    gaps = []
    for j in range(first, last + 1):
        s = step_to(s, t_now, t[j], drag_k, H)
        t_now = t[j]
        gaps.append(np.sqrt((s[0] - x[j]) ** 2 + (s[1] - y[j]) ** 2 + (s[2] - z[j]) ** 2))
    return np.sqrt(np.mean(np.array(gaps) ** 2))


def stepped_crossing(t_now, s, drag_k):
    """Time and floor position where the stepped ball comes down through rim
    height: steps of H until it is below the rim on the way down, then bisection
    on the length of that last step, to a microsecond."""
    while True:
        s_next = rk4_step(s, H, drag_k)
        if s_next[2] < RIM and s_next[5] < 0:
            break
        s = s_next
        t_now = t_now + H
    lo = 0.0           # a step this long ends above the rim
    hi = H             # and this long ends below it
    while hi - lo > 1e-6:
        mid = (lo + hi) / 2
        if rk4_step(s, mid, drag_k)[2] > RIM:
            lo = mid
        else:
            hi = mid
    s = rk4_step(s, lo, drag_k)
    return t_now + lo, s[0], s[1]


def find_shot(shots, wanted):
    """The shot whose id is wanted."""
    for s in shots:
        if s['id'] == wanted:
            return s


def measured_crossing(t, x, y, z):
    """The rim crossing in the record: the last frame above rim height after the
    top, and a straight line from it to the next frame (which is below)."""
    i = int(np.argmax(z))
    while z[i + 1] >= RIM:
        i = i + 1
    f = (z[i] - RIM) / (z[i] - z[i + 1])     # how far from frame i to frame i+1
    return i, t[i] + f * (t[i + 1] - t[i]), x[i] + f * (x[i + 1] - x[i]), y[i] + f * (y[i + 1] - y[i])


train = load('train')
header = train['header']
shots = train['shots']
noise_z = header['tracking_noise']['vertical_m']
noise_xy = header['tracking_noise']['horizontal_m']
print(f'tracking noise from the header: vertical {100 * noise_z:.2f} cm, '
      f'horizontal {100 * noise_xy:.2f} cm')

area = np.pi * header['ball_radius_m'] ** 2
K_LOW = RHO * CD_LOW * area / (2 * MASS_HIGH)      # least drag: low C_D, heavy ball
K_HIGH = RHO * CD_HIGH * area / (2 * MASS_LOW)     # most drag: high C_D, light ball
DRAGS = [0.0, K_LOW, K_HIGH]
print(f'ball cross-section {area:.4f} m^2, k from {K_LOW:.4f} to {K_HIGH:.4f} per m')

# the free flight in every training arc
arcs = []
for s in shots:
    t = np.array(s['t'])
    x = np.array(s['x'])
    y = np.array(s['y'])
    z = np.array(s['z'])
    if straight_run(z):
        print(f"arc {s['id']} dropped: its height runs in a straight line (a filled gap)")
        continue
    arcs.append((s['id'], t, x, y, z, release(t, z), flight_end(t, z)))
print(f'{len(arcs)} arcs used')

# with no drag the stepped ball should follow the fitted parabola exactly
print()
worst = 0.0
for arc_id, t, x, y, z, r, e in arcs:
    t_mid, s0 = start_state(t, x, y, z, r, 10)
    dt = t[e] - t_mid
    parabola = np.array([s0[0] + s0[3] * dt, s0[1] + s0[4] * dt,
                         s0[2] + s0[5] * dt - 0.5 * G * dt ** 2])
    stepped = step_to(s0, t_mid, t[e], 0.0, H)[:3]
    worst = max(worst, np.max(np.abs(stepped - parabola)))
print(f'no drag, step {H} s: largest gap from the fitted parabola {1000 * worst:.6f} mm')

# step size: halve it and watch the position at the end of each free flight
print(f'with drag (k = {K_HIGH:.4f}), 10 frames fitted: largest change in any arc '
      f'when the step is halved')
steps = [0.08, 0.04, 0.02, 0.01, 0.005]
ends = []
for h in steps:
    row = []
    for arc_id, t, x, y, z, r, e in arcs:
        t_mid, s0 = start_state(t, x, y, z, r, 10)
        row.append(step_to(s0, t_mid, t[e], K_HIGH, h)[:3])
    ends.append(np.array(row))
changes = []
for i in range(1, len(steps)):
    gap = np.sqrt(np.sum((ends[i] - ends[i - 1]) ** 2, axis=1))    # one per arc
    changes.append(np.max(gap))
    line = f'  {steps[i - 1]:.3f} s to {steps[i]:.3f} s: {1000 * changes[-1]:.2e} mm'
    if i > 1:
        line = line + f'   ratio {changes[-2] / changes[-1]:.1f}'
    print(line)

# every arc, every fit length, all three models
results = {}
crossings = {}
for n_fit in FIT_LENGTHS:
    rows = []
    cross_rows = []
    for arc_id, t, x, y, z, r, e in arcs:
        t_mid, s0 = start_state(t, x, y, z, r, n_fit)
        row = []
        for drag_k in DRAGS:
            row.append(unseen_error(t, x, y, z, r + n_fit, e, t_mid, s0, drag_k))
        rows.append(row)
        # the measured crossing counts only if the free flight reaches it: no more
        # than half an acceleration window between the end of the flight and it
        i, tc, xc, yc = measured_crossing(t, x, y, z)
        if i - e <= WINDOW // 2:
            row = [arc_id]
            for drag_k in DRAGS:
                tp, xp, yp = stepped_crossing(t_mid, s0, drag_k)
                row.append(np.sqrt((xp - xc) ** 2 + (yp - yc) ** 2))
            cross_rows.append(row)
    results[n_fit] = 100 * np.array(rows)                           # to cm
    crossings[n_fit] = np.array(cross_rows) * [1, 100, 100, 100]    # id stays

print()
print('10 frames fitted: rms error on the unseen frames (cm)')
print(f"{'arc':>5} {'release':>7} {'end':>4} {'no drag':>8} {'k low':>6} {'k high':>6}")
for m in range(len(arcs)):
    arc_id, t, x, y, z, r, e = arcs[m]
    u = results[10][m]
    print(f'{arc_id:>5} {r:>7} {e:>4} {u[0]:8.1f} {u[1]:6.1f} {u[2]:6.1f}')
print('arcs whose free flight reaches the measured crossing: '
      + ' '.join(str(int(a)) for a in crossings[10][:, 0]))

print()
for n_fit in FIT_LENGTHS:
    u = results[n_fit]
    c = crossings[n_fit]
    med = np.median(u, axis=0)
    cmed = np.median(c[:, 1:], axis=0)
    print(f'{n_fit} frames fitted (medians over the arcs, cm)')
    print(f'  unseen frames, {len(u)} arcs:  no drag {med[0]:.1f}  k low {med[1]:.1f}  '
          f'k high {med[2]:.1f}   drag closer on {np.sum(u[:, 1] < u[:, 0])} and '
          f'{np.sum(u[:, 2] < u[:, 0])}')
    print(f'  rim crossing, {len(c)} arcs:    no drag {cmed[0]:.1f}  k low {cmed[1]:.1f}  '
          f'k high {cmed[2]:.1f}   drag closer on {np.sum(c[:, 2] < c[:, 1])} and '
          f'{np.sum(c[:, 3] < c[:, 1])}')

# Figure 1: the step check
plt.figure(figsize=(6, 4))
plt.loglog(steps[1:], 1000 * np.array(changes), 'o-', label=f'k = {K_HIGH:.4f} per m')
plt.axhline(1000 * noise_z, color='gray', linestyle='--', label='tracker noise, 3.07 cm')
plt.xlabel('step after halving (s)')
plt.ylabel('largest change in an arc (mm)')
plt.title('Change in the stepped position when the step is halved')
plt.legend(fontsize=8)
plt.tight_layout()
plt.savefig('convergence.svg')
plt.close()

# Figure 2: one arc, all three models, side view
s = find_shot(shots, SHOW)
t = np.array(s['t'])
x = np.array(s['x'])
y = np.array(s['y'])
z = np.array(s['z'])
r = release(t, z)
e = flight_end(t, z)
t_mid, s0 = start_state(t, x, y, z, r, 10)
d = np.sqrt((x - s['hoop_x']) ** 2 + (y - s['hoop_y']) ** 2)   # distance from the hoop
plt.figure(figsize=(7, 4))
plt.plot(d, z, '.', color='lightgray', label='all frames')
plt.plot(d[r:e + 1], z[r:e + 1], '.', color='black', label='free flight')
plt.plot(d[r:r + 10], z[r:r + 10], 'o', mfc='none', color='black', label='the 10 frames fitted')
names = ['no drag', f'k = {K_LOW:.4f}', f'k = {K_HIGH:.4f}']
for m in range(3):
    path = [s0]
    state = s0
    while not (state[2] < RIM and state[5] < 0):    # until it comes down through the rim
        state = rk4_step(state, H, DRAGS[m])
        path.append(state)
    path = np.array(path)
    plt.plot(np.sqrt((path[:, 0] - s['hoop_x']) ** 2 + (path[:, 1] - s['hoop_y']) ** 2),
             path[:, 2], label=names[m])
plt.axhline(RIM, color='gray', linestyle='--', linewidth=0.8)
plt.xlim(0, d[r] + 0.5)
plt.ylim(RIM - 0.5, np.max(z) + 0.3)
plt.gca().invert_xaxis()
plt.title(f'Arc {SHOW}: stepped from 10 fitted frames, three ways')
plt.xlabel('distance from the hoop center across the floor (m)')
plt.ylabel('ball height (m)')
plt.legend(fontsize=8)
plt.tight_layout()
plt.savefig('one_arc.svg')
plt.close()

# Figure 3: median errors against frames fitted
fig, axes = plt.subplots(1, 2, figsize=(9, 3.8))
marks = ['o-', 's-', '^-']
for m in range(3):
    unseen = []
    cross = []
    for n_fit in FIT_LENGTHS:
        unseen.append(np.median(results[n_fit][:, m]))
        cross.append(np.median(crossings[n_fit][:, m + 1]))
    axes[0].plot(FIT_LENGTHS, unseen, marks[m], label=names[m])
    axes[1].plot(FIT_LENGTHS, cross, marks[m], label=names[m])
axes[0].set_title(f'rms error on the unseen frames, {len(arcs)} arcs')
axes[1].set_title(f'Error at the rim crossing, {len(crossings[10])} arcs')
axes[0].set_ylabel('median rms distance (cm)')
axes[1].set_ylabel('median distance across the floor (cm)')
for ax in axes:
    ax.axhline(100 * noise_z, color='gray', linestyle='--', linewidth=0.8,
               label='tracker noise')
    ax.set_xlabel('frames fitted for the starting state')
    ax.set_xticks(FIT_LENGTHS)
    ax.set_ylim(bottom=0)
    ax.legend(fontsize=8)
fig.tight_layout()
fig.savefig('errors.svg')
plt.close(fig)
