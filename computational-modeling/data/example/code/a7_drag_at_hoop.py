"""Assignment 7: does drag make the flight model's prediction at the hoop better?

Run this from the unzipped pack folder. For every training arc it finds the free
flight the way the assignment 5 memo did and fits the first 10 frames of it
(straight lines across the floor, and a parabola with gravity held at 9.81 for the
height). From the 10th frame it steps the ball on to the last frame before the hoop
with Heun's method, once with no drag and once with quadratic drag, and measures
how far each prediction is from where the ball was. It prints the step check, one
line per arc and a summary, and saves one_arc.svg and hoop_errors.svg.
"""
import json

import numpy as np
import matplotlib.pyplot as plt

G = 9.81          # m/s^2
K = 0.016         # 1/m, drag constant: C_D 0.35 and a 600 g ball (notes, State as a vector)
H = 0.01          # s, the step, checked by halving below
N_FIT = 10        # frames given to the fit (0.4 s at 25 frames a second)
WINDOW = 9        # frames in each acceleration estimate
NEAR_HOOP = 1.0   # m, the flight is cut before the ball gets this close to the hoop
SHOW = 1111       # the arc drawn in one_arc.svg

with open('shots/train.json') as f:
    train = json.load(f)
shots = train['shots']
noise = train['header']['tracking_noise']


def accel(t, z, i):
    """Vertical acceleration at frame i, from a parabola through the 9 frames around it."""
    h = WINDOW // 2
    c = np.polyfit(t[i - h:i + h + 1] - t[i], z[i - h:i + h + 1], 2)
    return 2 * c[0]


def filled_gap(z):
    """True if the height runs in a straight line for 6 frames or more, which
    measured heights with 3 cm of noise never do."""
    flat = np.abs(np.diff(z, 2)) < 0.001
    run = 0
    for f in flat:
        if f:
            run = run + 1
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
    last = None                  # the last frame where the hand is still pushing up
    for i in range(WINDOW // 2, top):
        if accel(t, z, i) > 0:
            last = i
    if last is not None:
        start = last + WINDOW // 2 + 1
    else:
        start = 0
    dx = np.array(s['x']) - s['hoop_x']
    dy = np.array(s['y']) - s['hoop_y']
    end = int(np.argmax(np.hypot(dx, dy) < NEAR_HOOP)) - 1   # last frame 1 m or more out
    return start, end


def start_state(t, x, y, z, start):
    """Position and velocity at the last of the N_FIT fitted frames. Time is
    measured from that frame, so each fit's constant is the position there and
    its slope is the velocity."""
    last = start + N_FIT - 1
    dt = t[start:last + 1] - t[last]
    A = np.column_stack([np.ones_like(dt), dt])
    cx = np.linalg.lstsq(A, x[start:last + 1], rcond=None)[0]
    cy = np.linalg.lstsq(A, y[start:last + 1], rcond=None)[0]
    cz = np.linalg.lstsq(A, z[start:last + 1] + 0.5 * G * dt ** 2, rcond=None)[0]
    return np.array([cx[0], cy[0], cz[0], cx[1], cy[1], cz[1]])


def rate(s, k):
    """Rate of the state [x, y, z, vx, vy, vz]: the velocity, then gravity plus a
    drag of k times the speed squared, pointing against the velocity."""
    v = s[3:]
    speed = np.sqrt(np.sum(v ** 2))
    a = -k * speed * v
    a[2] = a[2] - G
    return np.concatenate([v, a])


def fly(s, t_from, t_to, k, h):
    """Step the state from t_from to t_to with Heun's method, in equal steps of
    about h (a whole number of them, so the last one lands on t_to)."""
    n = max(1, int(np.floor((t_to - t_from) / h + 0.5)))
    h = (t_to - t_from) / n
    for i in range(n):
        k1 = rate(s, k)
        k2 = rate(s + h * k1, k)
        s = s + h / 2 * (k1 + k2)
    return s


# every usable arc: its frames, where the flight starts and ends, and its starting state
arcs = []
for s in shots:
    z = np.array(s['z'])
    if filled_gap(z):
        print(f"{s['id']:>5}  skipped: the height runs in a straight line (filled-in tracking gap)")
        continue
    t = np.array(s['t'])
    x = np.array(s['x'])
    y = np.array(s['y'])
    start, end = find_flight(s)
    arcs.append([s['id'], t, x, y, z, start, end, start_state(t, x, y, z, start)])

# the step: with no drag Heun should give the fitted parabola back exactly, and with
# drag the answer should stop changing when the step is halved
worst = 0.0
for arc_id, t, x, y, z, start, end, s0 in arcs:
    dt = t[end] - t[start + N_FIT - 1]
    parabola = np.array([s0[0] + s0[3] * dt, s0[1] + s0[4] * dt,
                         s0[2] + s0[5] * dt - 0.5 * G * dt ** 2])
    gap = fly(s0, t[start + N_FIT - 1], t[end], 0.0, H)[:3] - parabola
    worst = max(worst, np.max(np.abs(gap)))
print(f"no drag: largest gap between Heun and the fitted parabola {1000 * worst:.6f} mm")
for h in [0.04, 0.02, 0.01]:
    change = 0.0
    for arc_id, t, x, y, z, start, end, s0 in arcs:
        p1 = fly(s0, t[start + N_FIT - 1], t[end], K, h)
        p2 = fly(s0, t[start + N_FIT - 1], t[end], K, h / 2)
        change = max(change, np.sqrt(np.sum((p1[:3] - p2[:3]) ** 2)))
    print(f"with drag: halving the step from {h} s moves the prediction by at most {1000 * change:.4f} mm")

# the prediction at the last frame before the hoop, both ways
print()
print(f"{'arc':>5} {'start':>5} {'end':>4} {'no drag (cm)':>12} {'drag (cm)':>9}")
ids = []
err_none = []
err_drag = []
for arc_id, t, x, y, z, start, end, s0 in arcs:
    measured = np.array([x[end], y[end], z[end]])
    p0 = fly(s0, t[start + N_FIT - 1], t[end], 0.0, H)
    p1 = fly(s0, t[start + N_FIT - 1], t[end], K, H)
    e0 = 100 * np.sqrt(np.sum((p0[:3] - measured) ** 2))   # distance, in cm
    e1 = 100 * np.sqrt(np.sum((p1[:3] - measured) ** 2))
    ids.append(arc_id)
    err_none.append(e0)
    err_drag.append(e1)
    print(f"{arc_id:>5} {start:>5} {end:>4} {e0:12.1f} {e1:9.1f}")

err_none = np.array(err_none)
err_drag = np.array(err_drag)
n = len(ids)
print()
print(f"tracking noise from the header: {100 * noise['vertical_m']:.2f} cm vertical, "
      f"{100 * noise['horizontal_m']:.2f} cm horizontal")
print(f"arcs used: {n} of {len(shots)}")
print(f"median error at the hoop (cm): no drag {np.median(err_none):.1f}, drag {np.median(err_drag):.1f}")
print(f"worst error at the hoop (cm): no drag {np.max(err_none):.1f}, drag {np.max(err_drag):.1f}")
print(f"drag closer on {np.sum(err_drag < err_none)} of {n}")
print(f"median improvement (no drag minus drag, per arc): {np.median(err_none - err_drag):.1f} cm")

# one arc: how far each prediction is from the ball, frame by frame
for arc in arcs:
    if arc[0] == SHOW:
        break                       # arc is now the one with the id SHOW
arc_id, t, x, y, z, start, end, s0 = arc
frames = range(start + N_FIT, end + 1)
plt.figure(figsize=(7, 4))
for k, label in [(0.0, 'no drag'), (K, f'drag, k = {K}')]:
    gaps = []
    for j in frames:
        p = fly(s0, t[start + N_FIT - 1], t[j], k, H)
        gaps.append(100 * np.sqrt((p[0] - x[j]) ** 2 + (p[1] - y[j]) ** 2 + (p[2] - z[j]) ** 2))
    plt.plot(t[start + N_FIT:end + 1], gaps, 'o-', label=label)
plt.axhline(100 * noise['vertical_m'], color='gray', linestyle='--', label='tracker noise')
plt.title(f'Arc {SHOW}: distance from the measured ball after the 10 fitted frames')
plt.xlabel('time from first frame (s)')
plt.ylabel('predicted to measured position (cm)')
plt.ylim(bottom=0)
plt.legend(fontsize=8)
plt.tight_layout()
plt.savefig('one_arc.svg')
plt.close()

# every arc: the error at the hoop, both ways
order = np.argsort(err_none)
pos = np.arange(n)
plt.figure(figsize=(7, 4))
plt.plot(pos, err_none[order], 'o', label='no drag')
plt.plot(pos, err_drag[order], 's', label=f'drag, k = {K}')
plt.axhline(100 * noise['vertical_m'], color='gray', linestyle='--', label='tracker noise')
plt.xticks(pos, [str(ids[i]) for i in order], rotation=90, fontsize=7)
plt.title(f'Error in the predicted position at the last frame before the hoop, {n} arcs')
plt.xlabel('arc (shot id)')
plt.ylabel('predicted to measured position (cm)')
plt.ylim(bottom=0)
plt.legend()
plt.tight_layout()
plt.savefig('hoop_errors.svg')
plt.close()
