"""Assignment 7: occupant travel relative to the car, with a step study.

Run from the unzipped pack folder. Model: one mass (the occupant) on a spring
and damper (the belt), driven by the car's acceleration,

    m u'' + c u' + k u = -m a_car(t)

with u the travel relative to the car (forward positive). The state (u, w = u')
is stepped with classical RK4. a_car is the crossmember channel filtered at
CFC 180, the class J211 gives a structural acceleration that will be
integrated, and between samples it is a straight line between neighbors.

Prints a table of travel against step for the filtered and the raw drive,
picks the step, then runs three checks. Saves travel.svg, drive.svg,
steps.svg and chest_check.svg.
"""
import json
import os

import numpy as np
import matplotlib.pyplot as plt

M = 75.0        # occupant mass, kg
K = 296000.0    # belt stiffness, N/m
C = 2800.0      # belt damping, N*s/m
G = 9.81        # m/s^2 per g
V0 = 15.60      # approach speed, m/s (56.15 km/h from the test record)
SETTLED = 0.001  # mm, a hundredth of the 0.1 mm I quote (RK4 makes this cheap)


def cfc(y, dt, cls):
    """SAE J211-1 Butterworth, forward then backward (assignment 4)."""
    wd = 2 * np.pi * cls * 2.0775
    wa = np.tan(wd * dt / 2)
    d = 1 + np.sqrt(2) * wa + wa**2
    a0 = wa**2 / d
    a1 = 2 * a0
    a2 = a0
    b1 = -2 * (wa**2 - 1) / d
    b2 = (-1 + np.sqrt(2) * wa - wa**2) / d

    def one_pass(x):
        out = np.zeros_like(x)
        for i in range(2, len(x)):
            out[i] = a0*x[i] + a1*x[i-1] + a2*x[i-2] + b1*out[i-1] + b2*out[i-2]
        return out

    forward = one_pass(y)
    backward = one_pass(forward[::-1])
    return backward[::-1]


def rk4(t, a_car, h):
    """Step the state (u, w) from rest at t[0] to the end of the record with RK4.
    Returns the step times, u and w."""
    def rate(time, u, w):
        a = np.interp(time, t, a_car)        # straight line between samples
        return w, (-C * w - K * u) / M - a

    n_steps = int(round((t[-1] - t[0]) / h))
    times = t[0] + h * np.arange(n_steps + 1)
    u = np.zeros(n_steps + 1)
    w = np.zeros(n_steps + 1)
    for n in range(n_steps):
        tn = times[n]
        un = u[n]
        wn = w[n]
        k1u, k1w = rate(tn, un, wn)
        k2u, k2w = rate(tn + h/2, un + h/2 * k1u, wn + h/2 * k1w)
        k3u, k3w = rate(tn + h/2, un + h/2 * k2u, wn + h/2 * k2w)
        k4u, k4w = rate(tn + h, un + h * k3u, wn + h * k3w)
        u[n+1] = un + h/6 * (k1u + 2*k2u + 2*k3u + k4u)
        w[n+1] = wn + h/6 * (k1w + 2*k2w + 2*k3w + k4w)
    return times, u, w


def travel(t, a_car, h):
    """Largest forward travel (mm) and when it happens (ms), at step h. This is
    the largest value on the step grid, so it can only be at or below the true
    peak; the step study shows how much that matters."""
    times, u, w = rk4(t, a_car, h)
    i = np.argmax(u)
    return 1000 * u[i], 1000 * times[i]


with open(os.path.join('crash', os.listdir('crash')[0])) as f:
    test = json.load(f)
ch = test['channels']['vehicle_x']
dt = ch['dt']
t = ch['t0'] + dt * np.arange(ch['n'])
raw = np.array(ch['y'])
a180 = cfc(raw, dt, 180)
print(f"drive: {ch['comment']} [{ch['code']}], "
      f"{ch['n']} samples every {1000 * dt} ms")
print(f"peak raw {np.min(raw) / G:.1f} g at {1000 * t[np.argmin(raw)]:.2f} ms, "
      f"CFC 180 {np.min(a180) / G:.1f} g at {1000 * t[np.argmin(a180)]:.2f} ms")
fn = np.sqrt(K / M) / (2 * np.pi)
print(f"belt natural frequency {fn:.2f} Hz (period {1000 / fn:.0f} ms), "
      f"damping ratio {C / (2 * np.sqrt(K * M)):.3f}")

# ---- step study: halve from 6.4 ms (128 samples) down to 0.025 ms (half a sample)
steps = []
for k in range(9):
    steps.append(128 * dt / 2**k)
results = {'CFC 180': [], 'raw': []}
print(f"\n{'step (ms)':>10} {'CFC 180 (mm)':>12} {'change':>9} "
      f"{'raw (mm)':>10} {'change':>9}")
drives = {'CFC 180': a180, 'raw': raw}
for k in range(len(steps)):
    h = steps[k]
    row = f"{1000 * h:10.4f}"
    for name, a in drives.items():
        x, at = travel(t, a, h)
        results[name].append(x)
        if k == 0:
            row = row + f" {x:12.4f} {'':>9}"
        else:
            row = row + f" {x:12.4f} {x - results[name][k-1]:+9.4f}"
    print(row)

# the step: the largest one where the next TWO halvings each move the CFC 180
# travel less than SETTLED (a single small change can be luck)
s180 = results['CFC 180']
for k in range(len(steps) - 2):
    first_change = abs(s180[k+1] - s180[k])
    second_change = abs(s180[k+2] - s180[k+1])
    if first_change < SETTLED and second_change < SETTLED:
        break                      # k is the step chosen
h = steps[k]
print(f"\nchosen step {1000 * h:.2f} ms ({h / dt:.0f} samples), "
      f"step x natural frequency {h * np.sqrt(K / M):.3f}")
print(f"the next two halvings move the travel "
      f"{s180[k+1] - s180[k]:+.4f} and {s180[k+2] - s180[k+1]:+.4f} mm")

times, u, w = rk4(t, a180, h)
i = np.argmax(u)
top = u[i]
when = times[i]
j = np.argmin(u)
print(f"TRAVEL {1000 * top:.2f} mm at {1000 * when:.1f} ms")
print(f"most negative travel {1000 * u[j]:.1f} mm at {1000 * times[j]:.1f} ms, "
      f"at the end of the record {1000 * u[-1]:.1f} mm")

# ---- checks
print("\nchecks")
print("1. the drive filtered three ways, all at the record's own step:")
checks = {'CFC 180': a180, 'CFC 60': cfc(raw, dt, 60), 'raw': raw}
for name, a in checks.items():
    x, at = travel(t, a, dt)
    print(f"   {name:8} {x:.4f} mm at {at:.2f} ms")
dv = np.sum((raw[1:] + raw[:-1]) / 2) * dt
print(f"2. velocity change in the drive {dv:.2f} m/s against an approach of "
      f"{V0:.2f} m/s, rebound {-dv - V0:.2f} m/s")
a_occ = -(K * u + C * w) / M                     # occupant's own acceleration, m/s^2
chest = cfc(np.array(test['channels']['chest_x']['y']), dt, 180)
io = np.argmin(a_occ)
ic = np.argmin(chest)
print(f"3. model occupant peak {a_occ[io] / G:.1f} g at {1000 * times[io]:.1f} ms, "
      f"driver chest (CFC 180) {chest[ic] / G:.1f} g at {1000 * t[ic]:.1f} ms")
# after the peak the model's spring pushes back. Does the chest show that?
io = np.argmax(a_occ)
ic = np.argmax(chest)
print(f"   largest push back: model {a_occ[io] / G:+.1f} g at "
      f"{1000 * times[io]:.1f} ms, "
      f"chest {chest[ic] / G:+.1f} g at {1000 * t[ic]:.1f} ms")

# ---- figures
plt.figure(figsize=(7, 4))
plt.plot(1000 * times, 1000 * u)
plt.plot(1000 * when, 1000 * top, 'o', color='tab:red')
plt.annotate(f"{1000 * top:.1f} mm at {1000 * when:.1f} ms",
             (1000 * when, 1000 * top), xytext=(10, 0), textcoords='offset points')
plt.ylim(-60, 130)
plt.axhline(0, color='gray', linewidth=0.8)
plt.xlabel('time from impact (ms)')
plt.ylabel('occupant travel relative to the car (mm)')
plt.title(f'Occupant travel, RK4 at {1000 * h:.1f} ms, CFC 180 drive')
plt.tight_layout()
plt.savefig('travel.svg')
plt.close()

plt.figure(figsize=(7, 4))
plt.plot(1000 * t, raw / G, linewidth=0.6, label='as recorded')
plt.plot(1000 * t, a180 / G, label='CFC 180')
plt.xlim(-10, 150)
plt.xlabel('time from impact (ms)')
plt.ylabel('acceleration (g)')
plt.title('Crossmember X acceleration [10SEATLERE00ACXP]')
plt.legend()
plt.tight_layout()
plt.savefig('drive.svg')
plt.close()

plt.figure(figsize=(7, 4))
steps_ms = []
for s in steps:
    steps_ms.append(1000 * s)
plt.semilogx(steps_ms, results['CFC 180'], 'o-', label='CFC 180 drive')
plt.semilogx(steps_ms, results['raw'], 's--', label='raw drive')
plt.axvline(1000 * dt, color='gray', linestyle=':', label='record sample interval')
plt.axvline(1000 * h, color='tab:red', linestyle=':', label='step used')
plt.xlabel('step (ms)')
plt.ylabel('largest travel (mm)')
plt.title('Largest occupant travel against RK4 step')
plt.legend()
plt.tight_layout()
plt.savefig('steps.svg')
plt.close()

plt.figure(figsize=(7, 4))
plt.plot(1000 * t, chest / G, label='driver chest X, measured (CFC 180)')
plt.plot(1000 * times, a_occ / G, label='model occupant')
plt.xlim(-10, 200)
plt.xlabel('time from impact (ms)')
plt.ylabel('acceleration (g)')
plt.title('Occupant acceleration: model against the dummy chest')
plt.legend()
plt.tight_layout()
plt.savefig('chest_check.svg')
plt.close()
