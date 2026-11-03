"""Assignment 8: how far from the center of the hoop each short record comes down
through rim height, with a 90% interval.

Run this from the unzipped pack folder. Each short record is fitted from the
frame after the hand lets go (gravity held at 9.81, the ball's ground speed
constant) and solved for where it falls through rim height. The tracker's noise
from the header is added to the fitted frames and the fit is run again, 1000
times, and the 5th and 95th percentiles of the 1000 distances are the interval.
The training arcs are cut off the same way and checked against where the ball
really came down. It prints a line per record and per arc, and saves
intervals.svg and check.svg.
"""
import json

import numpy as np
import matplotlib.pyplot as plt

G = 9.81          # m/s^2, gravity, held fixed
RIM = 3.048       # m, rim height
WINDOW = 9        # frames in each acceleration estimate
BAND = 5.0        # m/s^2, how close to -9.81 counts as free flight
RERUNS = 1000     # how many times each record is refitted with fresh noise

with open('shots/train.json') as f:
    train = json.load(f)
with open('shots/test_short.json') as f:
    short = json.load(f)

noise = train['header']['tracking_noise']
NOISE_Z = noise['vertical_m']        # 3.07 cm
NOISE_XY = noise['horizontal_m']     # 2.84 cm
HOOP_R = train['header']['hoop_inner_radius_m']
rng = np.random.default_rng(310)     # fixed seed, so every run prints the same


def accel(t, z, i):
    """Vertical acceleration at frame i, from a parabola through the 9 frames around it."""
    h = WINDOW // 2
    c = np.polyfit(t[i - h:i + h + 1] - t[i], z[i - h:i + h + 1], 2)
    return 2 * c[0]


def last_push(t, z):
    """The last frame before the top where the acceleration is upward, so the hand
    is still on the ball. The window needs 4 frames either side of a frame."""
    h = WINDOW // 2
    top = int(np.argmax(z))
    last = h
    for i in range(h, min(top, len(t) - h)):
        if accel(t, z, i) > 0:
            last = i
    return last


def distance(t, x, y, z, hoop):
    """Fit the frames and return how far from the hoop center the ball is when it
    falls through rim height. t is measured from the first frame given."""
    t = t - t[0]
    A = np.column_stack([np.ones_like(t), t])
    # height: z + (g/2) t^2 is a straight line when gravity is held at g
    c0, c1 = np.linalg.lstsq(A, z + 0.5 * G * t ** 2, rcond=None)[0]
    # solve c0 + c1 t - (g/2) t^2 = RIM and keep the later root (the ball falling)
    tc = (c1 + np.sqrt(c1 ** 2 + 2 * G * (c0 - RIM))) / G
    bx = np.linalg.lstsq(A, x, rcond=None)[0]
    by = np.linalg.lstsq(A, y, rcond=None)[0]
    return np.hypot(bx[0] + bx[1] * tc - hoop[0], by[0] + by[1] * tc - hoop[1])


def interval(t, x, y, z, hoop):
    """Median and 5th and 95th percentiles of the distance over RERUNS refits,
    each with the tracker's noise added to every fitted frame."""
    d = []
    for k in range(RERUNS):
        zk = z + rng.normal(0, NOISE_Z, len(z))
        xk = x + rng.normal(0, NOISE_XY, len(x))
        yk = y + rng.normal(0, NOISE_XY, len(y))
        d.append(distance(t, xk, yk, zk, hoop))
    return np.percentile(d, [50, 5, 95])


def came_down_clean(t, z, k):
    """True if nothing touched the ball before frame k, where it comes down through
    rim height: every acceleration from the top of the arc to 4 frames before k
    stays within BAND of -9.81. A bounce off the rim or the board breaks this."""
    for i in range(int(np.argmax(z)), k - WINDOW // 2 + 1):
        if abs(accel(t, z, i) + G) > BAND:
            return False
    return True


# how much flight a short record holds after the hand lets go
after = []
for s in short['shots']:
    t = np.array(s['t'])
    after.append(len(t) - 1 - last_push(t, np.array(s['z'])))
CUT = int(np.median(after))
print(f'frames after the last push in the short records: {sorted(after)}, median {CUT}')

# the interval on every short record
print()
print('short records: distance from the hoop center where the ball falls through rim height')
print(f"{'id':>5} {'frames':>6} {'median':>8}   {'90% interval'}")
short_rows = []
for s in short['shots']:
    t, x, y, z = [np.array(s[k]) for k in 'txyz']
    hoop = (s['hoop_x'], s['hoop_y'])
    first = last_push(t, z) + 1           # the first frame after the hand lets go
    med, lo, hi = interval(t[first:], x[first:], y[first:], z[first:], hoop)
    short_rows.append((s['id'], med, lo, hi))
    print(f"{s['id']:>5} {len(t) - first:>6} {med:6.2f} m  {lo:5.2f} to {hi:5.2f} m")

# the check: training arcs cut to CUT frames after the hand lets go
print()
print(f'training arcs, cut {CUT} frames after the last push')
check_rows = []
for s in train['shots']:
    t, x, y, z = [np.array(s[k]) for k in 'txyz']
    hoop = (s['hoop_x'], s['hoop_y'])
    # where the ball really came down: the frames either side of rim height
    top = int(np.argmax(z))
    k = top
    while not (z[k] >= RIM and z[k + 1] < RIM):
        k = k + 1
    f = (z[k] - RIM) / (z[k] - z[k + 1])
    real = np.hypot(x[k] + f * (x[k + 1] - x[k]) - hoop[0],
                    y[k] + f * (y[k + 1] - y[k]) - hoop[1])
    if not came_down_clean(t, z, k):
        print(f"{s['id']:>5}  not checked: not in free flight all the way down to rim height")
        continue
    end = last_push(t, z) + CUT + 1
    t, x, y, z = t[:end], x[:end], y[:end], z[:end]   # now it looks like a short record
    first = last_push(t, z) + 1
    med, lo, hi = interval(t[first:], x[first:], y[first:], z[first:], hoop)
    inside = lo <= real <= hi
    check_rows.append((s['id'], lo, hi, real, inside))
    print(f"{s['id']:>5}  interval {lo:5.2f} to {hi:5.2f} m, came down at {real:5.2f} m, "
          f"{'inside' if inside else 'OUTSIDE'}")

n_in = sum(r[4] for r in check_rows)
print()
print(f'inside its 90% interval: {n_in} of {len(check_rows)} arcs checked')

# figure 1: the 12 intervals
plt.figure(figsize=(7, 4.5))
for p, (sid, med, lo, hi) in enumerate(short_rows):
    plt.plot([lo, hi], [p, p], 'k-', linewidth=2)
    plt.plot(med, p, 'ko')
plt.axvline(HOOP_R, color='tab:orange', linestyle='--', label=f'inside edge of the rim ({HOOP_R:.2f} m)')
plt.yticks(range(len(short_rows)), [str(r[0]) for r in short_rows])
plt.xlabel('distance from the hoop center at rim height (m)')
plt.ylabel('short record (shot id)')
plt.title('Where each short record comes down: median and 90% interval')
plt.legend(fontsize=8)
plt.tight_layout()
plt.savefig('intervals.svg')
plt.close()

# figure 2: the check on the training arcs
plt.figure(figsize=(7, 3.5))
for p, (sid, lo, hi, real, inside) in enumerate(check_rows):
    plt.plot([lo, hi], [p, p], 'k-', linewidth=2)
    if inside:
        plt.plot(real, p, 'o', color='tab:blue')
    else:
        plt.plot(real, p, 'x', color='tab:red', markersize=9)
plt.plot([], [], 'o', color='tab:blue', label='came down inside the interval')
plt.plot([], [], 'x', color='tab:red', label='came down outside it')
plt.yticks(range(len(check_rows)), [str(r[0]) for r in check_rows])
plt.xlabel('distance from the hoop center at rim height (m)')
plt.ylabel('training arc (shot id)')
plt.title('Training arcs cut to a short record: interval and where the ball came down')
plt.legend(fontsize=8)
plt.tight_layout()
plt.savefig('check.svg')
plt.close()
