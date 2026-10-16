"""Assignment 5: model selection for the shot-flight model.

Run this from the unzipped pack folder. It compares two models of the ball's
height in free flight,

    free:   z = c0 + c1 t + c2 t^2           (c2 fitted, so gravity is fitted)
    fixed:  z = c0 + c1 t - (g/2) t^2        (g held at 9.81 m/s^2)

on every training arc. Each model is fitted to the first 6, 10 and 14 frames of
the flight and scored on the rest of the flight, which it did not see. It prints
the release frames, the frames of flight in the test records, a line per arc
and a summary table, and saves release.svg, errors_by_window.svg and arc_325.svg.
"""
import json

import numpy as np
import matplotlib.pyplot as plt

G = 9.81               # m/s^2
WINDOW = 9             # frames in each acceleration estimate (0.32 s)
TOL = 5.0              # m/s^2, how close to -g counts as "settled"
RUN = 4                # frames in a row it has to stay settled
RIM = 3.048            # m, rim height (from the header)
FIT_LENGTHS = [6, 10, 14]
MIN_HELD_OUT = 3       # an arc needs at least this many unseen frames to be scored


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
    the hand is still on the ball. None if there is no such frame."""
    a = accel(t, z)
    top = int(np.argmax(z))
    pushing = [i for i in range(top) if a[i] > 0]
    return pushing[-1] if pushing else None


def release(t, z):
    """The first frame after the last upward push at which the acceleration is
    within TOL of -g and stays there for RUN frames. None if it never does."""
    a = accel(t, z)
    p = last_push(t, z)
    first = p + 1 if p is not None else WINDOW // 2
    for i in range(first, len(t) - RUN + 1):
        if np.all(np.abs(a[i:i + RUN] + G) < TOL):
            return i
    return None


def flight_end(t, z):
    """Last frame of the flight: the frame before the acceleration leaves the
    band for RUN frames in a row (the ball has hit something), or the frame
    before the ball drops through rim height, whichever comes first."""
    a = accel(t, z)
    top = int(np.argmax(z))
    for i in range(top, len(t) - RUN + 1):
        if np.all(np.abs(a[i:i + RUN] + G) >= TOL) or z[i] < RIM:
            return i - 1
    return len(t) - 1


def straight_runs(z, frames=6):
    """First and last frame of any stretch where the height falls on a straight
    line for 'frames' steps or more. Measured heights carry about 3 cm of noise,
    so a straight line means the tracker filled a gap."""
    flat = np.abs(np.diff(z, 2)) < 0.001
    hits = [i for i in range(len(flat) - frames + 2) if flat[i:i + frames - 1].all()]
    return (hits[0], hits[-1] + frames) if hits else None


def fit(t, z, fixed):
    if fixed:   # the known term moves to the left-hand side
        A = np.column_stack([np.ones_like(t), t])
        c0, c1 = np.linalg.lstsq(A, z + 0.5 * G * t ** 2, rcond=None)[0]
        return np.array([c0, c1, -G / 2])
    A = np.column_stack([np.ones_like(t), t, t ** 2])
    return np.linalg.lstsq(A, z, rcond=None)[0]


def rms(c, t, z):
    return np.sqrt(np.mean((c[0] + c[1] * t + c[2] * t ** 2 - z) ** 2))


train = load('train')
shots = train['shots']
noise = train['header']['tracking_noise']['vertical_m']
print('vertical tracking noise from the header (m):', noise)

# how much flight does a test record give us to fit?
for name in ['test_short', 'test_mid', 'test_long']:
    seen = []
    for s in load(name)['shots']:
        t, z = np.array(s['t']), np.array(s['z'])
        seen.append(len(t) - 1 - last_push(t, z))
    print(f'{name:10}  frames after the last upward push: '
          f'median {np.median(seen):.0f}, range {min(seen)} to {max(seen)}')

# find the flight in every training arc
arcs = []
print()
print(f"{'arc':>5} {'release':>7} {'end':>4} {'frames':>6} {'steps not 40 ms':>16}")
odd_steps = []
for s in shots:
    t, z = np.array(s['t']), np.array(s['z'])
    gap = straight_runs(z)
    if gap:
        print(f"{s['id']:>5}  dropped: height is a straight line, "
              f"frames {gap[0]} to {gap[1]}")
        continue
    r, e = release(t, z), flight_end(t, z)
    steps = 1000 * np.diff(t[r:e + 1])     # ms between frames in the flight
    odd = steps[np.abs(steps - 40) > 5]
    odd_steps += list(odd)
    print(f"{s['id']:>5} {r:>7} {e:>4} {e - r + 1:>6} {len(odd):>16}")
    arcs.append((s['id'], t[r:e + 1], z[r:e + 1]))

print(f'steps other than 40 ms inside the flights: {len(odd_steps)}, '
      f'from {min(odd_steps):.0f} to {max(odd_steps):.0f} ms')

# both models, three fit lengths, scored on the unseen part of the flight
results = {}
for n_fit in FIT_LENGTHS:
    rows = []
    for arc_id, t, z in arcs:
        if len(t) - n_fit < MIN_HELD_OUT:
            continue
        tf, zf, th, zh = t[:n_fit], z[:n_fit], t[n_fit:], z[n_fit:]
        free, fixed = fit(tf, zf, False), fit(tf, zf, True)
        rows.append([rms(free, tf, zf), rms(fixed, tf, zf),
                     rms(free, th, zh), rms(fixed, th, zh), -2 * free[2]])
    # residuals and errors to cm, g stays in m/s^2
    results[n_fit] = np.array(rows) * [100, 100, 100, 100, 1]

print()
for n_fit, r in results.items():
    med = np.median(r, axis=0)
    print(f'{n_fit} frames fitted, {len(r)} arcs (medians over the arcs)')
    print(f'  residual (cm):     free {med[0]:.2f}  fixed {med[1]:.2f}  '
          f'free <= fixed on {np.sum(r[:, 0] <= r[:, 1])}')
    print(f'  held-out (cm):     free {med[2]:.1f}  fixed {med[3]:.1f}  '
          f'fixed closer on {np.sum(r[:, 3] < r[:, 2])}')
    print(f'  fitted g (m/s^2):  {med[4]:.2f}, '
          f'range {r[:, 4].min():.1f} to {r[:, 4].max():.1f}')

# whole flights, gravity fitted
g_whole = [-2 * fit(t, z, False)[2] for _, t, z in arcs]
print()
print(f'g fitted to whole flights: median {np.median(g_whole):.2f}, '
      f'range {min(g_whole):.2f} to {max(g_whole):.2f} m/s^2, {len(g_whole)} arcs')

# Figure 1: how the release is found, on one arc
s = [s for s in shots if s['id'] == 1223][0]
t, z = np.array(s['t']), np.array(s['z'])
a, r, e = accel(t, z), release(t, z), flight_end(t, z)
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(7, 5.5), sharex=True)
ax1.plot(t, z, '.', color='gray')
ax1.plot(t[r:e + 1], z[r:e + 1], '.', color='black')
ax1.set_ylabel('ball height (m)')
ax1.set_title('Arc 1223: height, and the free flight found in it (black)')
ax2.plot(t, a, '-', marker='.')
ax2.axhspan(-G - TOL, -G + TOL, color='tab:green', alpha=0.2,
            label='within 5 m/s² of -9.81')
ax2.axhline(0, color='gray', linewidth=0.8)
ax2.set_ylabel('vertical acceleration (m/s²)')
ax2.set_xlabel('time from first frame (s)')
ax2.set_title('Vertical acceleration, 9-frame parabola at each frame')
for ax in (ax1, ax2):
    ax.axvline(t[r], color='tab:red', linestyle='--', linewidth=0.8,
               label=f'release (frame {r})')
    ax.axvline(t[e], color='tab:blue', linestyle='--', linewidth=0.8,
               label=f'end of flight (frame {e})')
ax1.legend(fontsize=8, loc='upper left')
ax2.legend(fontsize=8, loc='upper left')
fig.tight_layout()
fig.savefig('release.svg')
plt.close(fig)

# Figure 2: residual and held-out error against frames fitted
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(9, 3.8))
models = [(0, 'gravity fitted', 'o-'), (1, 'gravity held at 9.81', 's-')]
for col, label, mark in models:
    resid = [np.median(results[n][:, col]) for n in FIT_LENGTHS]
    held_out = [np.median(results[n][:, col + 2]) for n in FIT_LENGTHS]
    ax1.plot(FIT_LENGTHS, resid, mark, label=label)
    ax2.plot(FIT_LENGTHS, held_out, mark, label=label)
ax1.set_title('Residual on the fitted frames')
ax2.set_title('Error on the unseen frames')
for ax in (ax1, ax2):
    ax.set_xlabel('frames fitted (25 per second)')
    ax.set_ylabel('median rms height error (cm)')
    ax.set_xticks(FIT_LENGTHS)
    ax.legend(fontsize=8)
fig.tight_layout()
fig.savefig('errors_by_window.svg')
plt.close(fig)

# Figure 3: the filled gap in arc 325
s = [s for s in shots if s['id'] == 325][0]
t, z = np.array(s['t']), np.array(s['z'])
lo, hi = straight_runs(z)
plt.figure(figsize=(7, 3.5))
plt.plot(t, z, '.-', color='gray', linewidth=0.6)
plt.plot(t[lo:hi + 1], z[lo:hi + 1], '.', color='tab:red',
         label=f'straight lines, frames {lo} to {hi}')
plt.title('Arc 325: ball height, with a stretch the tracker filled in')
plt.xlabel('time from first frame (s)')
plt.ylabel('ball height (m)')
plt.legend(fontsize=8)
plt.tight_layout()
plt.savefig('arc_325.svg')
plt.close()
