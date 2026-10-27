"""
a4_demo.py  --  Assignment 4: filter the crossmember channel

Reads the crash test from crash/ next to this script, finds the channel whose
header comment names the crossmember, filters it with the SAE J211-1 CFC
filter run twice (forward, then backward), and reports raw and filtered peaks.

Choices made in this script (each belongs in the report's assumptions):
  CFC = 60       DECIDED: "total vehicle comparison" row of the J211-1 table.
                 If the customer treats this as component analysis, CFC 600.
  k = 2.0775     DECIDED: constant in omega_d, as on the course slides.
  two passes     DECIDED: forward then backward, so the phase shifts cancel.
  INIT = "zero"  DEFAULT, NOT YET DECIDED: filter state before each pass is
                 zero.  The run also prints the "edge" result for comparison.
  peak           largest magnitude, sign kept (np.argmax(np.abs(...))).
  no bias        DEFAULT, NOT YET DECIDED: no zero-level correction is applied
                 before filtering.
  NOT YET CHECKED: whether the ISO/TS 13499 channel code says this channel is
                 already filtered.  If it is, it must not be filtered again.

Run:  python a4_demo.py
"""
import json
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

HERE = Path(__file__).parent
CRASH = HERE / "crash" / "09793.json"
PLOT = HERE / "a4-plot.png"

CFC = 60        # DECIDED (assumption): total vehicle comparison
INIT = "zero"   # DEFAULT, NOT YET DECIDED: "zero" or "edge"


def load_crash(path):
    with open(path) as f:
        return json.load(f)


def find_crossmember(test):
    # The key is our label; the comment is the instrument's.  Trust the comment.
    hits = [k for k, ch in test["channels"].items()
            if "CROSSMEMBER" in (ch.get("comment") or "").upper()]
    if len(hits) != 1:
        for k, ch in test["channels"].items():
            print(f"  {k:12s} {ch.get('comment')}")
        sys.exit(f"expected one crossmember channel, found {len(hits)}")
    return hits[0]


def cfc_coefficients(cfc, dt, k=2.0775):
    """Coefficients for y[n] = a0 x[n] + a1 x[n-1] + a2 x[n-2] + b1 y[n-1] + b2 y[n-2]."""
    wd = 2 * np.pi * cfc * k
    wa = np.tan(wd * dt / 2)
    D = 1 + np.sqrt(2) * wa + wa**2
    a0 = wa**2 / D
    a1 = 2 * a0
    a2 = a0
    b1 = -2 * (wa**2 - 1) / D
    b2 = (-1 + np.sqrt(2) * wa - wa**2) / D
    return a0, a1, a2, b1, b2


def filter_pass(x, coeffs, init="zero"):
    """One forward pass of the difference equation over x."""
    a0, a1, a2, b1, b2 = coeffs
    x = np.asarray(x, dtype=float)
    y = np.zeros(len(x))
    if init == "zero":
        x1 = x2 = y1 = y2 = 0.0      # nothing before the record
    elif init == "edge":
        x1 = x2 = y1 = y2 = x[0]     # as if the signal had sat at x[0] forever
    else:
        raise ValueError(init)
    for i in range(len(x)):
        y[i] = a0 * x[i] + a1 * x1 + a2 * x2 + b1 * y1 + b2 * y2
        x2, x1 = x1, x[i]
        y2, y1 = y1, y[i]
    return y


def filter_twopass(x, coeffs, init="zero"):
    """Forward pass, then a backward pass, so the phase shifts cancel."""
    fwd = filter_pass(x, coeffs, init)
    return filter_pass(fwd[::-1], coeffs, init)[::-1]


def peak(t, a):
    # Largest magnitude, sign kept.  This is a choice; state it in the report.
    i = np.argmax(np.abs(a))
    return a[i], t[i]


def main():
    test = load_crash(CRASH)
    key = find_crossmember(test)
    ch = test["channels"][key]

    x = np.array(ch["y"])
    dt = ch["dt"]
    t = ch["t0"] + dt * np.arange(ch["n"])

    print(f"test {test['testNo']}: {key}  '{ch['comment']}'")
    print(f"  {ch['n']} samples, dt = {dt} s ({1 / dt:.0f} Hz), unit {ch['unit']}")
    print(f"  edges: x[0] = {x[0]:.2f} at {t[0] * 1000:.2f} ms, "
          f"x[-1] = {x[-1]:.2f} at {t[-1] * 1000:.2f} ms")

    c = cfc_coefficients(CFC, dt)
    print(f"  CFC {CFC} coefficients: " + "  ".join(f"{v:.6e}" for v in c))

    y = filter_twopass(x, c, init=INIT)
    y_zero = filter_twopass(x, c, init="zero")
    y_edge = filter_twopass(x, c, init="edge")

    a, ta = peak(t, x)
    print(f"  raw peak:      {a:10.1f} {ch['unit']} at t = {ta * 1000:.2f} ms")
    a, ta = peak(t, y)
    print(f"  filtered peak: {a:10.1f} {ch['unit']} at t = {ta * 1000:.2f} ms"
          f"   (CFC {CFC}, two passes, init = {INIT})")
    p0, _ = peak(t, y_zero)
    pe, _ = peak(t, y_edge)
    print(f"  peak, zero init: {p0:.2f}   edge init: {pe:.2f}   diff: {pe - p0:.3g}")

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(t * 1000, x, color="#2a78d6", lw=1, label="raw")
    ax.plot(t * 1000, y, color="#eb6834", lw=2,
            label=f"CFC {CFC}, two passes, {INIT} init")
    ax.set_title(f"Test {test['testNo']}: {ch['comment']}")
    ax.set_xlabel("time (ms)")
    ax.set_ylabel(f"acceleration ({ch['unit']})")
    ax.grid(color="#e0e0e0", lw=0.5)
    ax.legend()
    fig.tight_layout()
    fig.savefig(PLOT, dpi=150)
    print(f"  saved {PLOT.name}")
    plt.show()


if __name__ == "__main__":
    main()