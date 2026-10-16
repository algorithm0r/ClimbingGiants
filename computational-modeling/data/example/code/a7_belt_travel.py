"""Assignment 7: how far the occupant moves relative to the car.

Run this from the unzipped pack folder. The occupant is one mass held to the car
by the belt (a spring and a damper). What drives it is the crossmember
accelerometer, filtered at CFC 180. The state (travel u, and its rate w) is
stepped with forward Euler at the record's own sample interval, then again at
half and a quarter of it, to show the answer has settled.
Saves travel.svg and drive.svg.
"""
import json
import os

import numpy as np
import matplotlib.pyplot as plt

M = 75.0      # occupant mass (kg), from the restraint group
K = 296e3     # belt stiffness (N/m), 296 kN/m
C = 2.8e3     # belt damping (N*s/m), 2.8 kN*s/m
G = 9.81      # m/s^2 in one g


def cfc(y, dt, cls):
    """SAE J211-1 filter from assignment 4, run forward then backward."""
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
            out[i] = (a0*x[i] + a1*x[i-1] + a2*x[i-2]
                      + b1*out[i-1] + b2*out[i-2])
        return out

    return one_pass(one_pass(y)[::-1])[::-1]


def euler_travel(t, a_car, h):
    """Forward Euler on the state (u, w) at step h, starting at rest at t[0].
    u is the occupant's travel relative to the car, forward is positive.
    Between two samples the car's acceleration is a straight line (np.interp)."""
    times = np.arange(t[0], t[-1] + h / 2, h)
    acc = np.interp(times, t, a_car)
    u = np.zeros(len(times))
    w = np.zeros(len(times))
    for n in range(len(times) - 1):
        u[n+1] = u[n] + h * w[n]
        w[n+1] = w[n] + h * ((-C * w[n] - K * u[n]) / M - acc[n])
    return times, u


# the crash folder holds one file, the test
folder = 'crash'
with open(os.path.join(folder, os.listdir(folder)[0])) as f:
    test = json.load(f)
ch = test['channels']['vehicle_x']   # header: left rear seat crossmember
print(ch['comment'], ch['code'], ch['unit'])
dt = ch['dt']
t = ch['t0'] + dt * np.arange(ch['n'])
a_raw = np.array(ch['y'])
a_car = cfc(a_raw, dt, 180)    # J211's class for structure that gets integrated

print(f"raw peak {a_raw.min() / G:.1f} g at {1000 * t[a_raw.argmin()]:.1f} ms, "
      f"CFC 180 peak {a_car.min() / G:.1f} g at {1000 * t[a_car.argmin()]:.1f} ms")

# the record's own step, then half, then a quarter
runs = []
previous = None
for h in [dt, dt / 2, dt / 4]:
    times, u = euler_travel(t, a_car, h)
    i = u.argmax()
    line = (f"step {1000 * h:.4f} ms   travel {1000 * u[i]:.3f} mm "
            f"at {1000 * times[i]:.2f} ms")
    if previous is not None:
        line += f"   change {1000 * (u[i] - previous):+.3f} mm"
    print(line)
    previous = u[i]
    runs.append((h, times, u))

# Euler is order 1, so the error at a step is about twice the change
# made by halving it (and in the opposite direction)
h, times, u = runs[0]
change = runs[1][2].max() - u.max()
print(f"error at the record's step is about {-1000 * 2 * change:+.3f} mm, "
      f"so the settled travel is about {1000 * (u.max() + 2 * change):.2f} mm")
j = u.argmin()
print(f"travel goes most negative at {1000 * times[j]:.1f} ms: {1000 * u[j]:.1f} mm")

# the travel, all three steps on top of each other
plt.figure(figsize=(7, 4))
for h, times, u in runs:
    plt.plot(1000 * times, 1000 * u, label=f"step {1000 * h:.4f} ms")
h, times, u = runs[0]
i = u.argmax()
plt.plot(1000 * times[i], 1000 * u[i], 'ko')
plt.annotate(f"furthest {1000 * u[i]:.0f} mm at {1000 * times[i]:.0f} ms",
             (1000 * times[i], 1000 * u[i]), xytext=(10, 0),
             textcoords='offset points')
plt.ylim(-60, 130)
plt.axhline(0, color='gray', linewidth=0.8)
plt.xlim(-10, 300)
plt.xlabel('time from impact (ms)')
plt.ylabel('occupant travel relative to the car (mm)')
plt.title('Occupant travel, forward Euler at three steps (they overlap)')
plt.legend()
plt.tight_layout()
plt.savefig('travel.svg')
plt.close()

# what drives it: the crossmember, raw and filtered
plt.figure(figsize=(7, 4))
plt.plot(1000 * t, a_raw / G, linewidth=0.6, color='lightgray', label='as recorded')
plt.plot(1000 * t, a_car / G, label='CFC 180 (used in the model)')
plt.xlim(-10, 300)
plt.xlabel('time from impact (ms)')
plt.ylabel('acceleration (g)')
plt.title('Left rear seat crossmember X acceleration [10SEATLERE00ACXP]')
plt.legend()
plt.tight_layout()
plt.savefig('drive.svg')
plt.close()
