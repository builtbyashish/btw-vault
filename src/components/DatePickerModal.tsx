import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Check,
  X,
  RotateCcw,
} from 'lucide-react-native';
import { HapticService } from '../core/haptics';

export interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  initialValue?: string;
  mode?: 'date' | 'time';
  title?: string;
  accentColor?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatFriendlyDate(dateStr?: string): string {
  if (!dateStr) return '—';
  // Check YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return dateStr;
}

export function formatFriendlyTime(timeStr?: string): string {
  if (!timeStr) return '—';
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(\s*(AM|PM))?$/i);
  if (match) {
    const hours = parseInt(match[1], 10);
    const mins = match[2];
    const ampm = match[4]
      ? match[4].toUpperCase()
      : hours >= 12
      ? 'PM'
      : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins} ${ampm}`;
  }
  return timeStr;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  initialValue = '',
  mode = 'date',
  title,
  accentColor = '#007AFF',
}) => {
  // Calendar state
  const today = useMemo(() => new Date(), []);

  // Parse initial date
  const parsedDate = useMemo(() => {
    if (mode === 'date' && initialValue) {
      const parts = initialValue.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dt = new Date(y, m, d);
        if (!isNaN(dt.getTime())) return dt;
      }
    }
    return today;
  }, [initialValue, mode, today]);

  const [currentYear, setCurrentYear] = useState(parsedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(parsedDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(
    initialValue ? parsedDate.getDate() : today.getDate()
  );

  // Time state
  const initialTimeParts = useMemo(() => {
    if (mode === 'time' && initialValue) {
      const match = initialValue.match(/^(\d{1,2}):(\d{2})/);
      if (match) {
        return {
          hour: parseInt(match[1], 10),
          min: parseInt(match[2], 10),
        };
      }
    }
    return { hour: today.getHours(), min: Math.floor(today.getMinutes() / 5) * 5 };
  }, [initialValue, mode, today]);

  const [selectedHour, setSelectedHour] = useState(initialTimeParts.hour);
  const [selectedMinute, setSelectedMinute] = useState(initialTimeParts.min);
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>(
    initialTimeParts.hour >= 12 ? 'PM' : 'AM'
  );

  // Sync state whenever modal opens
  useEffect(() => {
    if (visible) {
      if (mode === 'date') {
        setCurrentYear(parsedDate.getFullYear());
        setCurrentMonth(parsedDate.getMonth());
        setSelectedDay(initialValue ? parsedDate.getDate() : today.getDate());
      } else {
        setSelectedHour(initialTimeParts.hour);
        setSelectedMinute(initialTimeParts.min);
        setTimePeriod(initialTimeParts.hour >= 12 ? 'PM' : 'AM');
      }
    }
  }, [visible, mode, initialValue, parsedDate, initialTimeParts, today]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      day: number;
      isCurrentMonth: boolean;
      year: number;
      month: number;
    }> = [];

    // Prev month overflow
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        year: currentMonth === 0 ? currentYear - 1 : currentYear,
        month: currentMonth === 0 ? 11 : currentMonth - 1,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        year: currentYear,
        month: currentMonth,
      });
    }

    // Next month overflow to complete 5 or 6 rows (multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        year: currentMonth === 11 ? currentYear + 1 : currentYear,
        month: currentMonth === 11 ? 0 : currentMonth + 1,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    HapticService.selection();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    HapticService.selection();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number, isCurrentMonth: boolean, y: number, m: number) => {
    HapticService.selection();
    if (!isCurrentMonth) {
      setCurrentYear(y);
      setCurrentMonth(m);
    }
    setSelectedDay(day);
  };

  const handleConfirmDate = () => {
    HapticService.selection();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const dateString = `${currentYear}-${pad(currentMonth + 1)}-${pad(selectedDay)}`;
    onSelect(dateString);
    onClose();
  };

  const handleConfirmTime = () => {
    HapticService.selection();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    let h24 = selectedHour;
    // Standardize to 24h
    if (timePeriod === 'PM' && h24 < 12) h24 += 12;
    if (timePeriod === 'AM' && h24 === 12) h24 = 0;
    const timeString = `${pad(h24)}:${pad(selectedMinute)}`;
    onSelect(timeString);
    onClose();
  };

  const handlePreset = (type: 'today' | '+30' | '+365' | 'clear') => {
    HapticService.selection();
    if (type === 'clear') {
      onSelect('');
      onClose();
      return;
    }
    const target = new Date();
    if (type === '+30') target.setDate(target.getDate() + 30);
    if (type === '+365') target.setFullYear(target.getFullYear() + 1);

    setCurrentYear(target.getFullYear());
    setCurrentMonth(target.getMonth());
    setSelectedDay(target.getDate());

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const dateString = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
    onSelect(dateString);
    onClose();
  };

  const isToday = (day: number, month: number, year: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isSelected = (day: number, month: number, year: number) => {
    return (
      day === selectedDay &&
      month === currentMonth &&
      year === currentYear
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.sheet}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              {mode === 'date' ? (
                <Calendar color={accentColor} size={18} style={{ marginRight: 6 }} />
              ) : (
                <Clock color={accentColor} size={18} style={{ marginRight: 6 }} />
              )}
              <Text style={styles.headerTitle}>
                {title || (mode === 'date' ? 'Select Date' : 'Select Time')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.closeBtn}
            >
              <X color="#8E8E93" size={18} />
            </TouchableOpacity>
          </View>

          {mode === 'date' ? (
            <>
              {/* Month & Year Navigation Header */}
              <View style={styles.navRow}>
                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={handlePrevMonth}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronLeft color="#007AFF" size={20} />
                </TouchableOpacity>

                <View style={styles.monthYearDisplay}>
                  <Text style={styles.monthYearText}>
                    {MONTH_NAMES[currentMonth]} {currentYear}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={handleNextMonth}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronRight color="#007AFF" size={20} />
                </TouchableOpacity>
              </View>

              {/* Days of week header */}
              <View style={styles.weekHeaderRow}>
                {DAYS_OF_WEEK.map((d, idx) => (
                  <View key={d + idx} style={styles.weekDayCol}>
                    <Text
                      style={[
                        styles.weekDayText,
                        (idx === 0 || idx === 6) && styles.weekEndText,
                      ]}
                    >
                      {d}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((item, idx) => {
                  const sel = isSelected(item.day, item.month, item.year);
                  const tod = isToday(item.day, item.month, item.year);

                  return (
                    <TouchableOpacity
                      key={`${item.year}-${item.month}-${item.day}-${idx}`}
                      style={[
                        styles.dayCell,
                        sel && { backgroundColor: accentColor },
                        !sel && tod && styles.todayCell,
                      ]}
                      onPress={() =>
                        handleSelectDay(
                          item.day,
                          item.isCurrentMonth,
                          item.year,
                          item.month
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          !item.isCurrentMonth && styles.otherMonthDayText,
                          sel && styles.selectedDayText,
                          !sel && tod && { color: accentColor, fontWeight: '700' },
                        ]}
                      >
                        {item.day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Quick Presets */}
              <View style={styles.presetsRow}>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => handlePreset('today')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetChipText}>Today</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => handlePreset('+30')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetChipText}>+30 Days</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => handlePreset('+365')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetChipText}>+1 Year</Text>
                </TouchableOpacity>

                {initialValue ? (
                  <TouchableOpacity
                    style={[styles.presetChip, styles.presetClearChip]}
                    onPress={() => handlePreset('clear')}
                    activeOpacity={0.7}
                  >
                    <RotateCcw color="#FF3B30" size={11} style={{ marginRight: 3 }} />
                    <Text style={[styles.presetChipText, { color: '#FF3B30' }]}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: accentColor }]}
                onPress={handleConfirmDate}
                activeOpacity={0.8}
              >
                <Check color="#FFFFFF" size={17} strokeWidth={2.6} style={{ marginRight: 6 }} />
                <Text style={styles.confirmBtnText}>Set Date</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* TIME PICKER MODE */
            <View style={styles.timePickerContainer}>
              {/* Hour & Minute display */}
              <View style={styles.timeDisplayRow}>
                <View style={styles.timeUnitCol}>
                  <Text style={styles.timeUnitLabel}>HOUR</Text>
                  <View style={styles.timeChipsGrid}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
                      const sel = (selectedHour % 12 || 12) === h;
                      return (
                        <TouchableOpacity
                          key={h}
                          style={[
                            styles.timeNumChip,
                            sel && { backgroundColor: accentColor },
                          ]}
                          onPress={() => {
                            HapticService.selection();
                            setSelectedHour(h);
                          }}
                        >
                          <Text
                            style={[
                              styles.timeNumText,
                              sel && styles.selectedTimeNumText,
                            ]}
                          >
                            {h}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Minute selection */}
                <View style={styles.timeUnitCol}>
                  <Text style={styles.timeUnitLabel}>MINUTE</Text>
                  <View style={styles.timeChipsGrid}>
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => {
                      const sel = selectedMinute === m;
                      const pad = m < 10 ? `0${m}` : `${m}`;
                      return (
                        <TouchableOpacity
                          key={m}
                          style={[
                            styles.timeNumChip,
                            sel && { backgroundColor: accentColor },
                          ]}
                          onPress={() => {
                            HapticService.selection();
                            setSelectedMinute(m);
                          }}
                        >
                          <Text
                            style={[
                              styles.timeNumText,
                              sel && styles.selectedTimeNumText,
                            ]}
                          >
                            :{pad}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* AM / PM Segmented Control */}
              <View style={styles.ampmRow}>
                {(['AM', 'PM'] as const).map((p) => {
                  const sel = timePeriod === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.ampmTab,
                        sel && { backgroundColor: accentColor },
                      ]}
                      onPress={() => {
                        HapticService.selection();
                        setTimePeriod(p);
                      }}
                    >
                      <Text
                        style={[
                          styles.ampmTabText,
                          sel && styles.selectedAmpmTabText,
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: accentColor }]}
                onPress={handleConfirmTime}
                activeOpacity={0.8}
              >
                <Check color="#FFFFFF" size={17} strokeWidth={2.6} style={{ marginRight: 6 }} />
                <Text style={styles.confirmBtnText}>Set Time</Text>
              </TouchableOpacity>
            </View>
          )}

          <SafeAreaView edges={['bottom']} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default DatePickerModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 12 : 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Month navigation
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearDisplay: {
    paddingHorizontal: 12,
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },

  // Weekday row
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekDayCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  weekEndText: {
    color: '#6366F1',
  },

  // Calendar Grid
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1.15,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginVertical: 2,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  otherMonthDayText: {
    color: '#C7C7CC',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Presets
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    marginTop: 4,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  presetClearChip: {
    backgroundColor: '#FEE2E2',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  // Confirm Button
  confirmBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Time Picker
  timePickerContainer: {
    paddingVertical: 8,
  },
  timeDisplayRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timeUnitCol: {
    flex: 1,
  },
  timeUnitLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  timeChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  timeNumChip: {
    width: '30%',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeNumText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  selectedTimeNumText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ampmRow: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  ampmTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ampmTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  selectedAmpmTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
