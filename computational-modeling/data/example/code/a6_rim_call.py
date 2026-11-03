"""Assignment 6: when, where and whether each short-record shot comes down through the rim.

Run this from the unzipped pack folder. For each of the 12 short test records it
fits the frames of free flight (gravity held at 9.81), finds both times the fitted
ball is at rim height with the quadratic formula, keeps the later one (the ball
coming down), and calls the shot from where the ball is then. It then makes the
same calls on the training arcs, cut to the same number of frames, and counts how
often they agree with the play-by-play. It prints one line per record and saves
one_record.svg and calls.svg.
"""
import json

import numpy as np
import matplotlib.pyplot as plt

G = 9.81          # m/s^2, held, as Bob chose in assignment 5
WINDOW = 9        # frames in each acceleration estimate, as in assignment 5
SKIP_AFTER = 2    # the flight starts this many frames after the last upward push
LAST_AFTER = 7    # training arcs are cut this many frames after the last push
SHOW = 158        # the record drawn in one_record.svg

with open('shots/test_short.json') as f:
    short = json.load(f)
with open('shots/train.json') as f:
    train = json.load(f)

h = short['header']
RIM = h['rim_height_m']
IN_R = h['hoop_inner_radius_m'] - h['ball_radius_m']    # m, inside this the ball cannot touch the rim
OUT_R = h['hoop_inner_radius_m'] + h['ball_radius_m']   # m, outside this it cannot reach the rim


def last_push(t, z):
    """The last frame before the top where the vertical acceleration is upward,
    from a parabola through the 9 frames around each frame (the hand is pushing).
    None if there is no such frame."""
    k = WINDOW // 2
    top = min(int(np.argmax(z)), len(t) - k)
    last = None
    for i in range(k, top):
        c = np.polyfit(t[i - k:i + k + 1] - t[i], z[i - k:i + k + 1], 2)
        if 2 * c[0] > 0:
            last = i
    return last


def crossing(t, x, y, z):
    """Fit the frames, then return the falling crossing of rim height (its time
    and where the ball is, from the hoop center) and the earlier, rising root."""
    # height: z + (g/2) t^2 = c0 + c1 t is a straight line, fitted by least squares
    A = np.column_stack([np.ones_like(t), t])
    c0, c1 = np.linalg.lstsq(A, z + 0.5 * G * t ** 2, rcond=None)[0]
    bx = np.linalg.lstsq(A, x, rcond=None)[0]       # x = bx[0] + bx[1] t
    by = np.linalg.lstsq(A, y, rcond=None)[0]       # y = by[0] + by[1] t
    # rim height: -(g/2) t^2 + c1 t + (c0 - RIM) = 0, by the quadratic formula
    a = -G / 2
    b = c1
    c = c0 - RIM
    root = np.sqrt(b ** 2 - 4 * a * c)
    rising = (-b + root) / (2 * a)      # a is negative, so this is the earlier root
    falling = (-b - root) / (2 * a)     # and this is the later one, after the top
    return falling, bx[0] + bx[1] * falling, by[0] + by[1] * falling, rising


def call(d):
    if d < IN_R:
        return 'in'
    if d > OUT_R:
        return 'out'
    return 'rim'


def flight(s, first, last):
    """Times, positions from the hoop center, and heights of frames first..last."""
    t = np.array(s['t'][first:last + 1])
    x = np.array(s['x'][first:last + 1]) - s['hoop_x']
    y = np.array(s['y'][first:last + 1]) - s['hoop_y']
    z = np.array(s['z'][first:last + 1])
    return t, x, y, z


print('short records begin:', h['record_begins'])
print(f'in if under {IN_R:.4f} m from the hoop center, out if over {OUT_R:.4f} m')
print()
print(f"{'shot':>5} {'push':>4} {'fitted':>6} {'rose past rim':>13} {'rising root':>11} "
      f"{'falling root':>12} {'ahead':>6} {'x':>6} {'y':>6} {'d':>6} {'call':>5} {'g if fitted':>11}")
rows = []
for s in short['shots']:
    p = last_push(np.array(s['t']), np.array(s['z']))
    t, x, y, z = flight(s, p + SKIP_AFTER, len(s['t']) - 1)
    tc, xc, yc, rising = crossing(t, x, y, z)
    d = np.hypot(xc, yc)
    up = int(np.argmax(np.array(s['z']) >= RIM))       # first frame at rim height or above
    g_fit = -2 * np.polyfit(t, z, 2)[0]                # gravity, if it were fitted instead
    # 'ahead' below is how long before the crossing the record's last frame comes
    rows.append((s['id'], xc, yc, d))
    print(f"{s['id']:>5} {p:>4} {len(t):>6} {s['t'][up]:>11.2f} s {rising:>9.3f} s "
          f"{tc:>10.3f} s {tc - t[-1]:6.2f} {xc:6.2f} {yc:6.2f} {d:6.3f} {call(d):>5} {g_fit:>11.1f}")

# the same calls on the training arcs, cut LAST_AFTER frames after the last push
print()
print(f'training arcs, cut {LAST_AFTER} frames after the last push, against the play-by-play')
counts = {}
for word in ['in', 'rim', 'out']:
    counts[word] = [0, 0]          # [arcs given this call, of which made]
for s in train['shots']:
    if s['id'] == 325:
        continue                   # filled-in gap, left out in assignment 5
    p = last_push(np.array(s['t']), np.array(s['z']))
    if p is None:
        p = WINDOW // 2 - 1        # no push found: start where the estimates start
    t, x, y, z = flight(s, p + SKIP_AFTER, p + LAST_AFTER)
    tc, xc, yc, rising = crossing(t, x, y, z)
    word = call(np.hypot(xc, yc))
    counts[word][0] = counts[word][0] + 1
    if s['pbp_made']:
        counts[word][1] = counts[word][1] + 1
for word in ['in', 'rim', 'out']:
    print(f'  called {word:3}: {counts[word][0]:2} arcs, {counts[word][1]:2} of them made')

# Figure 1: one record, its fitted parabola and both of its roots
for s in short['shots']:
    if s['id'] == SHOW:
        break                      # s is now the record with the id SHOW
p = last_push(np.array(s['t']), np.array(s['z']))
t, x, y, z = flight(s, p + SKIP_AFTER, len(s['t']) - 1)
tc, xc, yc, rising = crossing(t, x, y, z)
A = np.column_stack([np.ones_like(t), t])
c0, c1 = np.linalg.lstsq(A, z + 0.5 * G * t ** 2, rcond=None)[0]
tt = np.linspace(rising - 0.1, tc + 0.1, 200)
plt.figure(figsize=(7, 4))
plt.plot(s['t'], s['z'], 'o', mfc='none', color='gray', label='every frame of the record')
plt.plot(t, z, 'o', color='black', label='frames fitted')
plt.plot(tt, c0 + c1 * tt - 0.5 * G * tt ** 2, label='parabola, gravity held at 9.81')
plt.axhline(RIM, color='tab:red', linestyle='--', linewidth=0.8, label='rim height')
plt.plot(rising, RIM, 's', color='tab:orange', label=f'rising root, {rising:.2f} s')
plt.plot(tc, RIM, 'x', color='tab:red', markersize=10, label=f'falling root, {tc:.2f} s')
plt.title(f'Record {SHOW}: the fitted flight and both times it is at rim height')
plt.xlabel('time from first frame (s)')
plt.ylabel('ball height (m)')
plt.legend(fontsize=8, loc='lower right')
plt.tight_layout()
plt.savefig('one_record.svg')
plt.close()

# Figure 2: where each ball is predicted to come down, seen from above
ang = np.linspace(0, 2 * np.pi, 200)
plt.figure(figsize=(6, 6))
plt.plot(IN_R * np.cos(ang), IN_R * np.sin(ang), color='tab:green', label='in (under 0.109 m)')
plt.plot(OUT_R * np.cos(ang), OUT_R * np.sin(ang), color='tab:red', label='out (over 0.348 m)')
for shot_id, xc, yc, d in rows:
    plt.plot(xc, yc, 'o', color='black')
    plt.annotate(str(shot_id), (xc, yc), textcoords='offset points', xytext=(4, 4), fontsize=8)
plt.gca().set_aspect('equal')
plt.title('Predicted crossing points, 12 short records')
plt.xlabel('along the court from the hoop center (m)')
plt.ylabel('across the court from the hoop center (m)')
plt.legend(fontsize=8, loc='lower right')
plt.tight_layout()
plt.savefig('calls.svg')
plt.close()
