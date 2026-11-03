"""Assignment 6: when and where each short-record shot comes down through the rim.

Run this from the unzipped pack folder. For each of the 12 short test records it
finds the frames of free flight, fits the height with gravity held at 9.81 m/s^2
and the two floor coordinates with straight lines, and finds the falling crossing
of rim height by bisection. Before that it tries the same method on the training
arcs, cut to the same number of flight frames, and compares each prediction with
the one the whole flight gives and with the play-by-play. It prints what it finds
and saves short_record.svg, training_check.svg and predictions.svg.
"""
import json

import numpy as np
import matplotlib.pyplot as plt

G = 9.81               # m/s^2, held (assignment 5)
WINDOW = 9             # frames in each acceleration estimate, as in assignment 5
NEAR_HOOP = 1.0        # m, a whole flight ends at the last frame this far from the hoop
TOL_T = 1e-6           # s, bisection stops when the bracket is this narrow
SKIP = [325]           # training arc with a filled-in gap (found in assignment 5)
SHOW = 158             # the short record drawn in short_record.svg


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
    """The last frame before the top where the acceleration is upward, meaning
    the hand is still on the ball."""
    a = accel(t, z)
    top = int(np.argmax(z))
    last = None
    for i in range(top):
        if a[i] > 0:
            last = i
    return last


def fit_height(t, z, held):
    """Parabola z = c0 + c1 t + c2 t^2, with c2 = -g/2 when gravity is held."""
    if held:
        A = np.column_stack([np.ones_like(t), t])
        c = np.linalg.lstsq(A, z + 0.5 * G * t ** 2, rcond=None)[0]
        return np.array([c[0], c[1], -G / 2])
    A = np.column_stack([np.ones_like(t), t, t ** 2])
    return np.linalg.lstsq(A, z, rcond=None)[0]


def fit_line(t, v):
    """Straight line v = b0 + b1 t (no drag, so the floor speed is constant)."""
    A = np.column_stack([np.ones_like(t), t])
    return np.linalg.lstsq(A, v, rcond=None)[0]


def above_rim(c, t, rim):
    """f(t): how far the fitted ball is above rim height at time t."""
    return c[0] + c[1] * t + c[2] * t ** 2 - rim


def falling_crossing(c, rim):
    """Bisection on f between the top of the parabola and 2 s after it. The
    parabola is above the rim at its top and only falls after it, so the one
    root in that bracket is the falling crossing. Returns the root and the
    number of evaluations of f."""
    a = -c[1] / (2 * c[2])          # time of the top
    b = a + 2.0
    fa = above_rim(c, a, rim)
    fb = above_rim(c, b, rim)
    if fa <= 0 or fb >= 0:
        return None, 2              # the fitted ball never gets above the rim
    evals = 2
    while b - a > TOL_T:
        m = (a + b) / 2
        fm = above_rim(c, m, rim)
        evals = evals + 1
        if fm > 0:
            a = m                   # still above the rim, so the root is later
        else:
            b = m
    return (a + b) / 2, evals


def predict(s, first, last, rim, held=True):
    """Fit frames first..last of shot s and return the crossing time, where the
    ball is then (x and y from the hoop center, m) and the evaluations used."""
    t = np.array(s['t'][first:last + 1])
    c = fit_height(t, np.array(s['z'][first:last + 1]), held)
    tc, evals = falling_crossing(c, rim)
    if tc is None:
        return None
    bx = fit_line(t, np.array(s['x'][first:last + 1]) - s['hoop_x'])
    by = fit_line(t, np.array(s['y'][first:last + 1]) - s['hoop_y'])
    return tc, bx[0] + bx[1] * tc, by[0] + by[1] * tc, evals


def call(d, in_r, out_r, margin):
    """In, out or too close, with the bands narrowed by the margin."""
    if d + margin < in_r:
        return 'in'
    if d - margin > out_r:
        return 'out'
    return 'too close'


def near_hoop_end(s):
    """Last frame at least NEAR_HOOP from the hoop, measured across the floor."""
    dx = np.array(s['x']) - s['hoop_x']
    dy = np.array(s['y']) - s['hoop_y']
    return int(np.argmax(np.hypot(dx, dy) < NEAR_HOOP)) - 1


short = load('test_short')
h = short['header']
rim = h['rim_height_m']
in_r = h['hoop_inner_radius_m'] - h['ball_radius_m']    # clears the rim on every side
out_r = h['hoop_inner_radius_m'] + h['ball_radius_m']   # cannot touch the rim
print('short records, header says they begin:', h['record_begins'])
print(f'rim {rim} m, in radius {in_r:.4f} m, out radius {out_r:.4f} m')

# where does each short record start, and how much flight does it hold?
print()
print(f"{'shot':>5} {'height at frame 0':>17} {'last push':>9} {'frames after':>12} {'up through rim':>14}")
n_after = []
for s in short['shots']:
    t = np.array(s['t'])
    z = np.array(s['z'])
    p = last_push(t, z)
    up = int(np.argmax(z >= rim))          # first frame at or above the rim
    n_after.append(len(t) - 1 - p)
    print(f"{s['id']:>5} {z[0]:>15.2f} m {p:>9} {len(t) - 1 - p:>12} {up:>14}")
n_cut = int(np.median(n_after))
print(f'frames after the last push: median {n_cut}, range {min(n_after)} to {max(n_after)}')

# the training arcs: do they run 15 frames past the crossing, as the header says,
# and does the ball bounce before the crossing the frames record?
train = load('train')['shots']
print()
bounced = []
for s in train:
    z = np.array(s['z'])
    top = int(np.argmax(z))
    below = top + int(np.argmax(z[top:] < rim))    # first frame under the rim after the top
    if len(z) - below != 15:
        print(f"arc {s['id']}: {len(z) - below} frames from the crossing to the end, not 15")
    if np.any(np.diff(z[near_hoop_end(s):below]) > 0):
        bounced.append(s['id'])         # the height rises again before it reaches the rim
text = ''
for shot_id in bounced:
    text = text + f' {shot_id}'
print(f'{len(bounced)} of {len(train)} arcs rise again between 1 m out and the crossing:{text}')

# the method on the training arcs, cut to n_cut frames after the last push
print()
print(f'training arcs cut to {n_cut} frames after the last push, against the whole flight')
print(f"{'arc':>5} {'made':>5} {'t whole':>7} {'t cut':>6} {'d whole':>7} {'d cut':>6} {'place err':>9}")
t_err = []
p_err = []
t_err_free = []
p_err_free = []
d_cut = []
made = []
for s in train:
    if s['id'] in SKIP:
        continue
    t = np.array(s['t'])
    z = np.array(s['z'])
    p = last_push(t, z)
    if p is None:
        p = WINDOW // 2 - 1      # no push found: start where the first estimate is
    whole = predict(s, p + 1, near_hoop_end(s), rim)
    cut = predict(s, p + 1, p + n_cut, rim)
    free = predict(s, p + 1, p + n_cut, rim, held=False)
    err = np.hypot(cut[1] - whole[1], cut[2] - whole[2])
    t_err.append(cut[0] - whole[0])
    p_err.append(err)
    if free is not None:
        t_err_free.append(free[0] - whole[0])
        p_err_free.append(np.hypot(free[1] - whole[1], free[2] - whole[2]))
    d_cut.append(np.hypot(cut[1], cut[2]))
    made.append(s['pbp_made'])
    print(f"{s['id']:>5} {str(s['pbp_made']):>5} {whole[0]:7.3f} {cut[0]:6.3f} "
          f"{np.hypot(whole[1], whole[2]):7.3f} {d_cut[-1]:6.3f} {err:9.3f}")
t_err = np.array(t_err)
p_err = np.array(p_err)
d_cut = np.array(d_cut)
made = np.array(made)
margin = np.median(p_err)
print(f'held:   time error median {np.median(np.abs(t_err)):.3f} s, worst {np.max(np.abs(t_err)):.3f} s; '
      f'place error median {margin:.3f} m, worst {np.max(p_err):.3f} m')
print(f'fitted: time error median {np.median(np.abs(t_err_free)):.3f} s, worst {np.max(np.abs(t_err_free)):.3f} s; '
      f'place error median {np.median(p_err_free):.3f} m, worst {np.max(p_err_free):.3f} m '
      f'({len(p_err_free)} arcs with a crossing)')

# how the calls compare with the play-by-play, with and without the margin
for m in [0.0, margin]:
    print(f'margin {m:.3f} m:', end='')
    for word in ['in', 'out', 'too close']:
        hits = [k for k in range(len(d_cut)) if call(d_cut[k], in_r, out_r, m) == word]
        n_made = int(np.sum(made[hits])) if hits else 0
        print(f'  {word} {len(hits)} ({n_made} made)', end='')
    print()

# the twelve short records
print()
print(f'short records, frames from the last push + 1 to the end, margin {margin:.3f} m')
print(f"{'shot':>5} {'frames':>6} {'steps not 40 ms':>15} {'t cross':>7} {'after last':>10} "
      f"{'x':>7} {'y':>7} {'d':>6} {'evals':>5}  call")
rows = []
for s in short['shots']:
    t = np.array(s['t'])
    z = np.array(s['z'])
    p = last_push(t, z)
    tc, x, y, evals = predict(s, p + 1, len(t) - 1, rim)
    c = fit_height(t[p + 1:], z[p + 1:], True)
    roots = np.roots([c[2], c[1], c[0] - rim])      # the quadratic formula, as a check
    assert abs(max(roots) - tc) < TOL_T
    d = np.hypot(x, y)
    word = call(d, in_r, out_r, margin)
    steps = 1000 * np.diff(t[p + 1:])            # ms between the fitted frames
    odd = int(np.sum(np.abs(steps - 40) > 5))
    rows.append((s['id'], x, y, d, word))
    print(f"{s['id']:>5} {len(t) - 1 - p:>6} {odd:>15} {tc:7.3f} {tc - t[-1]:8.3f} s "
          f"{x:7.3f} {y:7.3f} {d:6.3f} {evals:>5}  {word}")

# Figure 1: one short record, what is in it, and the crossing it predicts
for s in short['shots']:
    if s['id'] == SHOW:
        break                    # s is now the record with the id SHOW
t = np.array(s['t'])
z = np.array(s['z'])
p = last_push(t, z)
c = fit_height(t[p + 1:], z[p + 1:], True)
tc = predict(s, p + 1, len(t) - 1, rim)[0]
tt = np.linspace(t[p + 1], tc + 0.1, 200)
fig, axes = plt.subplots(2, 1, figsize=(7, 5.5), sharex=True)
ax1 = axes[0]
ax2 = axes[1]
ax1.plot(t[:p + 1], z[:p + 1], 'o', mfc='none', color='gray', label='in the hand')
ax1.plot(t[p + 1:], z[p + 1:], 'o', color='black', label='frames fitted')
ax1.plot(tt, c[0] + c[1] * tt + c[2] * tt ** 2, '-', label='parabola, g held at 9.81')
ax1.axhline(rim, color='tab:red', linestyle='--', linewidth=0.8, label='rim height')
ax1.plot(tc, rim, 'x', color='tab:red', markersize=9, label=f'falling crossing, {tc:.2f} s')
ax1.set_ylabel('ball height (m)')
ax1.set_title(f'Short record {SHOW}: the frames, and the parabola fitted to its flight')
ax1.legend(fontsize=8, loc='upper left')
ax2.plot(t, accel(t, z), '.-')
ax2.axhline(0, color='gray', linewidth=0.8)
ax2.axhline(-G, color='tab:green', linestyle=':', label='-9.81')
ax2.axvline(t[p], color='gray', linestyle='--', linewidth=0.8, label=f'last upward push (frame {p})')
ax2.set_ylabel('vertical acceleration (m/s²)')
ax2.set_xlabel('time from first frame (s)')
ax2.set_title('Vertical acceleration, 9-frame parabola at each frame')
ax2.legend(fontsize=8, loc='lower left')
fig.tight_layout()
fig.savefig('short_record.svg')
plt.close(fig)

# Figure 2: the training check, time and place errors per arc
fig, axes = plt.subplots(1, 2, figsize=(9, 3.8))
ax1 = axes[0]
ax2 = axes[1]
ax1.hist(1000 * t_err, bins=10)
ax1.set_xlabel('time error, cut minus whole (ms)')
ax1.set_ylabel('number of arcs')
ax1.set_title('Crossing time')
ax2.hist(100 * p_err, bins=10)
ax2.axvline(100 * margin, color='k', linestyle='--', label=f'median, {100 * margin:.0f} cm')
ax2.set_xlabel('distance between the two crossing points (cm)')
ax2.set_title('Crossing place')
ax2.legend(fontsize=8)
fig.suptitle(f'{len(p_err)} training arcs: {n_cut} frames of flight against the whole flight')
fig.tight_layout()
fig.savefig('training_check.svg')
plt.close(fig)

# Figure 3: where the twelve are predicted to come down, seen from above
fig = plt.figure(figsize=(6, 6))
ang = np.linspace(0, 2 * np.pi, 200)
plt.plot(in_r * np.cos(ang), in_r * np.sin(ang), color='tab:green', label='in radius')
plt.plot(out_r * np.cos(ang), out_r * np.sin(ang), color='tab:red', label='out radius')
plt.plot((out_r + margin) * np.cos(ang), (out_r + margin) * np.sin(ang), ':', color='tab:red',
         label=f'out radius + margin ({margin:.2f} m)')
for shot_id, x, y, d, word in rows:
    plt.plot(x, y, 'o', color='black')
    plt.annotate(str(shot_id), (x, y), textcoords='offset points', xytext=(4, 4), fontsize=7)
plt.gca().set_aspect('equal')
plt.xlabel('along the court from the hoop center (m)')
plt.ylabel('across the court from the hoop center (m)')
plt.title('Predicted crossing points, 12 short records')
plt.legend(fontsize=8, loc='lower right')
plt.tight_layout()
plt.savefig('predictions.svg')
plt.close()
