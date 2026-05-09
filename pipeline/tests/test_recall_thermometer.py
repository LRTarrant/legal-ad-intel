"""Tests for recall_thermometer scoring logic."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipelines.recall_thermometer import compute_stage, reason_for_change


# ---------------------------------------------------------------------------
# compute_stage — baseline litigation thresholds (no recall class)
# ---------------------------------------------------------------------------

def test_stage_1_no_litigation_no_class_i():
    assert compute_stage(0, 0, 0, False, False, has_class_i=False) == 1


def test_stage_2_one_case():
    assert compute_stage(1, 1, 0, False, False) == 2


def test_stage_3_five_cases():
    assert compute_stage(5, 2, 0, False, False) == 3


def test_stage_3_specialty_firm():
    assert compute_stage(0, 0, 1, False, False) == 3


def test_stage_4_volume_threshold():
    assert compute_stage(25, 5, 2, False, False) == 4


def test_stage_4_jpml_petition():
    assert compute_stage(0, 0, 0, True, False) == 4


def test_stage_5_mdl_formed():
    assert compute_stage(0, 0, 0, False, True) == 5


def test_stage_5_volume_threshold():
    assert compute_stage(50, 10, 4, False, False) == 5


# ---------------------------------------------------------------------------
# compute_stage — Class I recall severity floor
# ---------------------------------------------------------------------------

def test_class_i_floors_zero_litigation_at_stage_2():
    """Class I recall lifts a manufacturer with zero litigation from Stage 1 to Stage 2."""
    assert compute_stage(0, 0, 0, False, False, has_class_i=True) == 2


def test_class_i_does_not_suppress_higher_litigation_stage():
    """Class I floor does not pull a Stage 3 manufacturer down to Stage 2."""
    assert compute_stage(5, 2, 0, False, False, has_class_i=True) == 3


def test_class_i_does_not_suppress_stage_4():
    assert compute_stage(25, 5, 2, False, False, has_class_i=True) == 4


def test_class_i_does_not_suppress_stage_5():
    assert compute_stage(0, 0, 0, False, True, has_class_i=True) == 5


def test_class_i_with_one_case_stays_at_stage_2():
    """Class I + 1 case is still Stage 2 — floor and litigation agree."""
    assert compute_stage(1, 1, 0, False, False, has_class_i=True) == 2


def test_no_class_i_stays_at_stage_1():
    """Without Class I, zero-litigation manufacturer stays Cold."""
    assert compute_stage(0, 0, 0, False, False, has_class_i=False) == 1


# ---------------------------------------------------------------------------
# reason_for_change — class_i_severity trigger
# ---------------------------------------------------------------------------

def test_reason_class_i_severity_when_class_i_drives_stage_change():
    """reason_for_change returns 'class_i_severity' when Class I lifts from 1 → 2."""
    reason = reason_for_change(
        prev_stage=1,
        new_stage=2,
        prev_case_count=0,
        new_case_count=0,
        prev_specialty_count=0,
        new_specialty_count=0,
        mdl_petition_filed=False,
        mdl_formed=False,
        has_class_i=True,
    )
    assert reason == "class_i_severity"


def test_reason_new_case_takes_priority_over_class_i():
    """New case added in same run takes priority over class_i_severity."""
    reason = reason_for_change(
        prev_stage=1,
        new_stage=2,
        prev_case_count=0,
        new_case_count=1,
        prev_specialty_count=0,
        new_specialty_count=0,
        mdl_petition_filed=False,
        mdl_formed=False,
        has_class_i=True,
    )
    assert reason == "new_case"


def test_reason_recompute_when_no_identifiable_trigger():
    reason = reason_for_change(
        prev_stage=2,
        new_stage=2,
        prev_case_count=1,
        new_case_count=1,
        prev_specialty_count=0,
        new_specialty_count=0,
        mdl_petition_filed=False,
        mdl_formed=False,
        has_class_i=False,
    )
    assert reason == "recompute"


def test_reason_class_i_no_trigger_when_already_at_or_above_stage_2():
    """Class I does not emit class_i_severity if manufacturer is already ≥ Stage 2."""
    reason = reason_for_change(
        prev_stage=2,
        new_stage=3,
        prev_case_count=1,
        new_case_count=5,
        prev_specialty_count=0,
        new_specialty_count=0,
        mdl_petition_filed=False,
        mdl_formed=False,
        has_class_i=True,
    )
    assert reason == "new_case"
