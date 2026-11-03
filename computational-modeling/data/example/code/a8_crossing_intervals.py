"""Assignment 8: 90% intervals on where each short record comes down through rim height.

Run this from the unzipped pack folder. For each short record it fits the frames
after the last upward push (a parabola in height with gravity held at 9.81, and
straight lines across the floor), solves for the point where the falling ball
reaches rim height, and splits that point into long/short (along the line
from the first fitted frame to the hoop) and left/right (across that line). It
then adds noise at the tracker's stated level to the fitted frames and fits and
solves again, 1000 times. The 50 lowest and 50 highest answers are left out, and the other 900
span the 90% interval.

The training arcs are cut to the length of a short record and given the same
intervals, which are checked against where each whole arc says the ball came
down. It prints a line per record and per arc and the counts, and saves
cloud.svg, short_intervals.svg and coverage.svg.
"""
import json

import numpy as np
import matplotlib.pyplot as plt

G = 9.81               # m/s^2, held fixed
RIM = 3.048            # m, rim height (from the header)
WINDOW = 9             # frames in each acceleration estimate (0.32 s)
TOL = 5.0              # m/s^2, how close to -g counts as free flight
RUN = 4                # frames in a row, for the end of a whole flight
DRAWS = 1000           # reruns per record
LEAVE = DRAWS // 20    # 50 answers left out at each end, which leaves 90%
SEED = 8               # the same random numbers on every run
SHOW = 1299            # the short record drawn in cloud.svg


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


def last_push(t, z):
    """The last frame before the top where the acceleration is upward (the hand
    is still on the ball). With no such frame, the first frame that has an
    acceleration estimate."""
    a = accel(t, z)
    top = int(np.argmax(z))
    last = WINDOW // 2
    for i in range(top):
        if a[i] > 0:
            last = i
    return last


def release(t, z):
    """Assignment 5's release on a whole arc: the first frame after the last push
    where the acceleration is within TOL of -g for RUN frames in a row."""
    a = accel(t, z)
    for i in range(last_push(t, z) + 1, len(t) - RUN + 1):
        if np.all(np.abs(a[i:i + RUN] + G) < TOL):
            return i


def flight_end(t, z):
    """Assignment 5's end of a whole flight: the frame before the acceleration
    leaves the band for RUN frames (the ball hit something), or before the ball
    drops below rim height, whichever comes first."""
    a = accel(t, z)
    for i in range(int(np.argmax(z)), len(t) - RUN + 1):
        if np.all(np.abs(a[i:i + RUN] + G) >= TOL) or z[i] < RIM:
            return i - 1
    return len(t) - 1


def filled_in(z):
    """True if the height runs in a straight line for 6 steps or more, which
    3 cm of tracking noise cannot do (the tracker filled a gap)."""
    flat = np.abs(np.diff(z, 2)) < 0.001
    for i in range(len(flat) - 4):
        if np.all(flat[i:i + 5]):
            return True
    return False


def line(t, v):
    """Least-squares straight line v = c0 + c1 t."""
    A = np.column_stack([np.ones_like(t), t])
    return np.linalg.lstsq(A, v, rcond=None)[0]


def crossing(t, x, y, z, fit_gravity=False):
    """Fit the frames given and solve for the falling crossing of rim height.
    Returns the time from the first frame given, and x and y there."""
    t = t - t[0]
    if fit_gravity:
        A = np.column_stack([np.ones_like(t), t, t ** 2])
        c0, c1, c2 = np.linalg.lstsq(A, z, rcond=None)[0]
    else:   # the known term moves to the left-hand side
        c0, c1 = line(t, z + 0.5 * G * t ** 2)
        c2 = -G / 2
    # c2 t^2 + c1 t + (c0 - RIM) = 0; with c2 < 0 the later root has the minus sign
    tc = (-c1 - np.sqrt(c1 ** 2 - 4 * c2 * (c0 - RIM))) / (2 * c2)
    bx = line(t, x)
    by = line(t, y)
    return tc, bx[0] + bx[1] * tc, by[0] + by[1] * tc


def observed(x, y, z):
    """The frame just before the ball comes down through rim height, and where it
    crossed, by straight-line interpolation between that frame and the next."""
    for k in range(int(np.argmax(z)), len(z) - 1):
        if z[k] >= RIM and z[k + 1] < RIM:
            f = (z[k] - RIM) / (z[k] - z[k + 1])
            return k, x[k] + f * (x[k + 1] - x[k]), y[k] + f * (y[k + 1] - y[k])


def split(x, y, s, x0, y0):
    """A crossing point as (long, right): meters past the hoop center along the
    line from (x0, y0), the first fitted frame, to the hoop, and meters to the
    right of that line as the shooter sees it."""
    ux = s['hoop_x'] - x0
    uy = s['hoop_y'] - y0
    n = np.hypot(ux, uy)
    ux = ux / n
    uy = uy / n
    dx = x - s['hoop_x']
    dy = y - s['hoop_y']
    return dx * ux + dy * uy, uy * dx - ux * dy


def interval(t, x, y, z, first, s, rng):
    """The crossing from the frames, and its 90% interval from DRAWS reruns with
    the tracker's noise added to the fitted frames. Returns the value, the low
    and high ends (each as long, right) and every rerun's answer."""
    t = t[first:]
    x = x[first:]
    y = y[first:]
    z = z[first:]
    x0 = x[0]
    y0 = y[0]
    tc, xc, yc = crossing(t, x, y, z)
    value = split(xc, yc, s, x0, y0)
    runs = np.zeros((DRAWS, 2))
    for k in range(DRAWS):
        zk = z + SIG_Z * rng.standard_normal(len(z))
        xk = x + SIG_XY * rng.standard_normal(len(x))
        yk = y + SIG_XY * rng.standard_normal(len(y))
        tc, xc, yc = crossing(t, xk, yk, zk)
        runs[k] = split(xc, yc, s, x0, y0)
    ends = np.sort(runs, axis=0)
    return np.array(value), ends[LEAVE], ends[DRAWS - 1 - LEAVE], runs


rng = np.random.default_rng(SEED)
train = load('train')
short = load('test_short')
noise = train['header']['tracking_noise']
SIG_Z = noise['vertical_m']
SIG_XY = noise['horizontal_m']
print(f'tracker noise from the header: vertical {100 * SIG_Z:.2f} cm, '
      f'horizontal {100 * SIG_XY:.2f} cm')

# how many frames does a short record have after the last push?
after = []
for s in short['shots']:
    t = np.array(s['t'])
    after.append(len(t) - 1 - last_push(t, np.array(s['z'])))
N_AFTER = int(np.median(after))
print(f'frames after the last upward push in the short records: '
      f'median {N_AFTER}, range {min(after)} to {max(after)}')

# the 12 short records
print()
print('short records, 90% intervals (m): past the hoop center, and right of the line to it')
print(f"{'id':>5} {'fitted':>6} {'long':>6} {'90% interval':>16} {'right':>6} {'90% interval':>16}")
rows = []
for s in short['shots']:
    t, x, y, z = [np.array(s[k]) for k in 'txyz']
    first = last_push(t, z) + 1
    v, lo, hi, runs = interval(t, x, y, z, first, s, rng)
    rows.append((s['id'], v, lo, hi))
    if s['id'] == SHOW:
        show_runs = runs
        show_v = v
    print(f"{s['id']:>5} {len(t) - first:>6} {v[0]:+6.2f} [{lo[0]:+6.2f}, {hi[0]:+6.2f}] "
          f"{v[1]:+6.2f} [{lo[1]:+6.2f}, {hi[1]:+6.2f}]")
widths = np.array([hi - lo for sid, v, lo, hi in rows])
print(f'median width: long/short {np.median(widths[:, 0]):.2f} m, '
      f'left/right {np.median(widths[:, 1]):.2f} m')

# held fixed: the first fitted frame. Start one frame later and see how far it moves
moved = []
for s, (sid, v, lo, hi) in zip(short['shots'], rows):
    t, x, y, z = [np.array(s[k]) for k in 'txyz']
    first = last_push(t, z) + 2
    tc, xc, yc = crossing(t[first:], x[first:], y[first:], z[first:])
    moved.append(np.abs(np.array(split(xc, yc, s, x[first], y[first])) - v))
moved = np.array(moved)
print(f'starting one frame later moves the value by a median of '
      f'{np.median(moved[:, 0]):.2f} m long/short and {np.median(moved[:, 1]):.2f} m left/right')

# the training arcs, cut to the same number of frames after the last push
print()
print(f'training arcs cut {N_AFTER} frames after the last push; '
      'answer = whole flight fitted, gravity free')
print(f"{'id':>5} {'long':>16} {'answer':>6} {'seen':>6} {'right':>16} {'answer':>6} {'seen':>6}")
cover = []
checked = []
arc_rows = []
for s in train['shots']:
    t, x, y, z = [np.array(s[k]) for k in 'txyz']
    if filled_in(z):
        print(f"{s['id']:>5}  left out: a stretch of the height is filled in")
        continue
    # the answer: the whole free flight, fitted with gravity free, solved for rim height
    r = release(t, z)
    e = flight_end(t, z)
    tc, xc, yc = crossing(t[r:e + 1], x[r:e + 1], y[r:e + 1], z[r:e + 1], fit_gravity=True)
    # the record as a short record would have been, and its interval
    end = last_push(t, z) + N_AFTER + 1
    tk, xk, yk, zk = t[:end], x[:end], y[:end], z[:end]
    first = last_push(tk, zk) + 1
    v, lo, hi, runs = interval(tk, xk, yk, zk, first, s, rng)
    answer = np.array(split(xc, yc, s, xk[first], yk[first]))
    cover.append([lo[0] <= answer[0] <= hi[0], lo[1] <= answer[1] <= hi[1],
                  answer[0] < lo[0], answer[0] > hi[0], answer[1] < lo[1], answer[1] > hi[1]])
    arc_rows.append((lo[0] - answer[0], hi[0] - answer[0]))
    # if the ball came down through rim height before touching anything (the
    # flight runs to within half a window of it), the frames show the crossing too
    k, xo, yo = observed(x, y, z)
    if e >= k - WINDOW // 2:
        obs = np.array(split(xo, yo, s, xk[first], yk[first]))
        checked.append([lo[0] <= obs[0] <= hi[0], lo[1] <= obs[1] <= hi[1]])
        seen = [f'{obs[0]:+6.2f}', f'{obs[1]:+6.2f}']
    else:
        seen = ['-', '-']
    print(f"{s['id']:>5} [{lo[0]:+6.2f}, {hi[0]:+6.2f}] {answer[0]:+6.2f} {seen[0]:>6} "
          f"[{lo[1]:+6.2f}, {hi[1]:+6.2f}] {answer[1]:+6.2f} {seen[1]:>6}")
cover = np.array(cover)
checked = np.array(checked)
n = len(cover)
print()
print(f'answer inside the 90% interval, {n} arcs: long/short {np.sum(cover[:, 0])}, '
      f'left/right {np.sum(cover[:, 1])}')
print(f'  long/short outside: {np.sum(cover[:, 2])} shorter, {np.sum(cover[:, 3])} longer')
print(f'  left/right outside: {np.sum(cover[:, 4])} further left, {np.sum(cover[:, 5])} further right')
print(f'crossing seen in the frames, {len(checked)} arcs: inside long/short {np.sum(checked[:, 0])}, '
      f'left/right {np.sum(checked[:, 1])}')

# Figure 1: the reruns for one short record, as points where the ball crosses
plt.figure(figsize=(5.5, 5.5))
plt.plot(show_runs[:, 1], show_runs[:, 0], '.', markersize=2, alpha=0.4,
         label=f'{DRAWS} reruns')
plt.plot(show_v[1], show_v[0], 'kx', markersize=10, label='fitted to the record')
angle = np.linspace(0, 2 * np.pi, 200)
hoop_r = train['header']['hoop_inner_radius_m']
plt.plot(hoop_r * np.cos(angle), hoop_r * np.sin(angle), 'k-', linewidth=1,
         label='inside of the rim')
plt.axis('equal')
plt.xlabel('right of the line to the hoop (m)')
plt.ylabel('past the hoop center (m)')
plt.title(f'Short record {SHOW}: where the reruns cross rim height')
plt.legend(fontsize=8)
plt.tight_layout()
plt.savefig('cloud.svg')
plt.close()

# Figure 2: the intervals on the 12 short records
fig, axes = plt.subplots(1, 2, figsize=(9, 4.2), sharey=True)
pos = np.arange(len(rows))
for col, ax, label in [(0, axes[0], 'past the hoop center (m)'),
                       (1, axes[1], 'right of the line to the hoop (m)')]:
    for p, (sid, v, lo, hi) in zip(pos, rows):
        ax.plot([lo[col], hi[col]], [p, p], 'k-')
        ax.plot(v[col], p, 'ko')
    ax.axvline(0, color='gray', linewidth=0.8)
    ax.set_xlabel(label)
axes[0].set_yticks(pos)
axes[0].set_yticklabels([str(sid) for sid, v, lo, hi in rows])
axes[0].set_ylabel('short record (shot id)')
axes[0].set_title('Long (+) or short (-)')
axes[1].set_title('Right (+) or left (-)')
fig.suptitle('90% intervals on the rim crossing, 12 short records')
fig.tight_layout()
fig.savefig('short_intervals.svg')
plt.close(fig)

# Figure 3: the long/short check on the training arcs, each interval drawn
# relative to its answer, so an interval that misses the zero line missed
plt.figure(figsize=(7, 4.2))
for p, (lo, hi) in enumerate(arc_rows):
    if lo <= 0 <= hi:
        color = 'tab:blue'
    else:
        color = 'tab:red'
    plt.plot([p, p], [lo, hi], '-', color=color, linewidth=3)
plt.axhline(0, color='k', linewidth=0.8)
plt.xlabel('training arc, cut to a short record (in file order)')
plt.ylabel('interval minus the answer (m)')
plt.title(f'Long/short 90% intervals against the whole-flight answer, {n} arcs')
plt.plot([], [], '-', color='tab:blue', linewidth=3, label='contains the answer')
plt.plot([], [], '-', color='tab:red', linewidth=3, label='misses it')
plt.legend(fontsize=8)
plt.tight_layout()
plt.savefig('coverage.svg')
plt.close()
