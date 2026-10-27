"""Assignment 5: which of Bob's two flight models to build on.

Run this from the unzipped pack folder. For every training arc it finds the
free flight, fits the first 10 frames of it two ways (gravity fitted, and
gravity held at 9.81), and checks both against the measured height where the
flight reaches the hoop. It prints one line per arc and a summary, and saves
one_arc.svg and hoop_errors.svg.
"""
import json

import numpy as np
import matplotlib.pyplot as plt

G = 9.81          # m/s^2, the value Bob holds gravity at
N_FIT = 10        # frames given to each fit (0.4 s at 25 frames a second)
WINDOW = 9        # frames in each acceleration estimate
NEAR_HOOP = 1.0   # m, the flight is cut before the ball gets this close to the hoop
SHOW = 1223       # the arc drawn in one_arc.svg

with open('shots/train.json') as f:
    shots = json.load(f)['shots']


def accel(t, z, i):
    """Vertical acceleration at frame i, from a parabola through the 9 frames around it."""
    h = WINDOW // 2
    c = np.polyfit(t[i - h:i + h + 1] - t[i], z[i - h:i + h + 1], 2)
    return 2 * c[0]


def filled_gap(z):
    """True if the height runs in a straight line for 6 frames or more.
    Real tracking noise (about 3 cm) never does that, so it means the tracker
    lost the ball and the gap was filled in."""
    flat = np.abs(np.diff(z, 2)) < 0.001
    run = 0
    for f in flat:
        if f:
            run = run + 1       # one more flat step in a row
        else:
            run = 0
        if run >= 5:
            return True
    return False


def find_flight(s):
    """First and last frame of the free flight: after the hand, before the hoop."""
    t = np.array(s['t'])
    z = np.array(s['z'])
    top = int(np.argmax(z))
    # the hand is still pushing while the acceleration is upward (above zero)
    last = None
    for i in range(WINDOW // 2, top):
        if accel(t, z, i) > 0:
            last = i
    # start half a window after the last push, so no estimate there touches the throw
    if last is not None:
        start = last + WINDOW // 2 + 1
    else:
        start = 0
    dx = np.array(s['x']) - s['hoop_x']
    dy = np.array(s['y']) - s['hoop_y']
    dist = np.hypot(dx, dy)               # distance from the hoop, in the floor plane
    end = int(np.argmax(dist < NEAR_HOOP)) - 1    # last frame still 1 m or more out
    return start, end


def fit_free(t, z):
    """z = c0 + c1 t + c2 t^2, all three from the data."""
    A = np.column_stack([np.ones_like(t), t, t ** 2])
    return np.linalg.lstsq(A, z, rcond=None)[0]


def fit_fixed(t, z):
    """c2 is -g/2, so move it to the left side and fit the other two."""
    A = np.column_stack([np.ones_like(t), t])
    c = np.linalg.lstsq(A, z + 0.5 * G * t ** 2, rcond=None)[0]
    return np.array([c[0], c[1], -G / 2])


def height(c, t):
    return c[0] + c[1] * t + c[2] * t ** 2


print(f"{'arc':>5} {'start':>5} {'end':>4} {'g fitted':>8} {'resid free':>10} {'resid fixed':>11}"
      f" {'hoop err free':>13} {'hoop err fixed':>14}")
ids = []
hoop_free = []
hoop_fixed = []
res_free = []
res_fixed = []
for s in shots:
    t = np.array(s['t'])
    z = np.array(s['z'])
    if filled_gap(z):
        print(f"{s['id']:>5}  skipped: the height runs in a straight line (filled-in tracking gap)")
        continue
    start, end = find_flight(s)
    tf = t[start:start + N_FIT]
    zf = z[start:start + N_FIT]
    free = fit_free(tf, zf)
    fixed = fit_fixed(tf, zf)
    # residual: rms gap on the 10 fitted frames (cm)
    rf = 100 * np.sqrt(np.mean((height(free, tf) - zf) ** 2))
    rx = 100 * np.sqrt(np.mean((height(fixed, tf) - zf) ** 2))
    # error: how far each prediction is from the measured height at the end of the flight (cm)
    ef = 100 * abs(height(free, t[end]) - z[end])
    ex = 100 * abs(height(fixed, t[end]) - z[end])
    ids.append(s['id'])
    res_free.append(rf)
    res_fixed.append(rx)
    hoop_free.append(ef)
    hoop_fixed.append(ex)
    print(f"{s['id']:>5} {start:>5} {end:>4} {-2 * free[2]:8.2f} {rf:10.2f} {rx:11.2f} {ef:13.1f} {ex:14.1f}")

hoop_free = np.array(hoop_free)
hoop_fixed = np.array(hoop_fixed)
res_free = np.array(res_free)
res_fixed = np.array(res_fixed)
n = len(ids)
print()
print(f"arcs used: {n} of {len(shots)}")
print(f"median residual on the fitted frames (cm): free {np.median(res_free):.2f}, fixed {np.median(res_fixed):.2f}")
print(f"free residual smaller or equal on {np.sum(res_free <= res_fixed)} of {n}")
print(f"median error at the hoop (cm): free {np.median(hoop_free):.1f}, fixed {np.median(hoop_fixed):.1f}")
print(f"worst error at the hoop (cm): free {np.max(hoop_free):.1f}, fixed {np.max(hoop_fixed):.1f}")
print(f"fixed closer at the hoop on {np.sum(hoop_fixed < hoop_free)} of {n}")

# one arc, both fits drawn on to the hoop
for s in shots:
    if s['id'] == SHOW:
        break                     # s is now the arc with the id SHOW
t = np.array(s['t'])
z = np.array(s['z'])
start, end = find_flight(s)
tf = t[start:start + N_FIT]
zf = z[start:start + N_FIT]
free = fit_free(tf, zf)
fixed = fit_fixed(tf, zf)
tp = np.linspace(t[start], t[end], 100)
plt.figure(figsize=(7, 4))
shown = slice(start - 4, end + 5)     # just the flight, with a few frames either side
plt.plot(t[shown], z[shown], '.', color='lightgray', label='frames outside the flight')
plt.plot(t[start:end + 1], z[start:end + 1], '.', color='black', label='free flight')
plt.plot(tf, zf, 'o', mfc='none', color='black', label='the 10 frames fitted')
plt.plot(tp, height(free, tp), label=f'gravity fitted ({-2 * free[2]:.1f} m/s²)')
plt.plot(tp, height(fixed, tp), label='gravity held at 9.81 m/s²')
plt.axvline(t[end], color='gray', linestyle='--', linewidth=0.8)
plt.title(f'Arc {SHOW}: both models fitted to 10 frames, drawn on to the hoop')
plt.xlabel('time from first frame (s)')
plt.ylabel('ball height (m)')
plt.legend(fontsize=8)
plt.tight_layout()
plt.savefig('one_arc.svg')
plt.close()

# every arc: the error at the hoop, both ways
order = np.argsort(hoop_fixed)
pos = np.arange(n)
plt.figure(figsize=(7, 4))
plt.plot(pos, hoop_free[order], 'o', label='gravity fitted')
plt.plot(pos, hoop_fixed[order], 's', label='gravity held at 9.81')
plt.xticks(pos, [str(ids[i]) for i in order], rotation=90, fontsize=7)
plt.yscale('log')
plt.title(f'Height error where the flight reaches the hoop, {n} arcs')
plt.xlabel('arc (shot id)')
plt.ylabel('|predicted - measured height| (cm)')
plt.legend()
plt.tight_layout()
plt.savefig('hoop_errors.svg')
plt.close()
