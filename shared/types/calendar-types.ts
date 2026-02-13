// Calendar types for Google Calendar and Zoho Calendar integration

export interface DaySchedule {
    dayName: string;
    dayIndex: number;
    startTime: string;
    endTime: string;
    enabled: boolean;
}

export interface CalendarAdvancedSettings {
    weeklySchedule: DaySchedule[];
    offDays: number[];
    bufferMinutes?: number;
}

export const DAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
] as const;

export const DEFAULT_WEEKLY_SCHEDULE: DaySchedule[] = [
    { dayName: 'Sunday', dayIndex: 0, startTime: '09:00', endTime: '17:00', enabled: false },
    { dayName: 'Monday', dayIndex: 1, startTime: '09:00', endTime: '17:00', enabled: true },
    { dayName: 'Tuesday', dayIndex: 2, startTime: '09:00', endTime: '17:00', enabled: true },
    { dayName: 'Wednesday', dayIndex: 3, startTime: '09:00', endTime: '17:00', enabled: true },
    { dayName: 'Thursday', dayIndex: 4, startTime: '09:00', endTime: '17:00', enabled: true },
    { dayName: 'Friday', dayIndex: 5, startTime: '09:00', endTime: '17:00', enabled: true },
    { dayName: 'Saturday', dayIndex: 6, startTime: '09:00', endTime: '17:00', enabled: false },
];

export function createDefaultScheduleFromHours(startTime: string, endTime: string): DaySchedule[] {
    return DEFAULT_WEEKLY_SCHEDULE.map(day => ({
        ...day,
        startTime,
        endTime
    }));
}

export function isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
}

export function isValidAdvancedSettings(settings: any): settings is CalendarAdvancedSettings {
    if (!settings || typeof settings !== 'object') return false;
    if (!Array.isArray(settings.weeklySchedule)) return false;
    if (!Array.isArray(settings.offDays)) return false;

    return settings.weeklySchedule.every((day: any) =>
        typeof day === 'object' &&
        typeof day.dayName === 'string' &&
        typeof day.dayIndex === 'number' &&
        typeof day.startTime === 'string' &&
        typeof day.endTime === 'string' &&
        typeof day.enabled === 'boolean' &&
        isValidTimeFormat(day.startTime) &&
        isValidTimeFormat(day.endTime)
    );
}

export function getDayName(dayIndex: number): string {
    return DAY_NAMES[dayIndex] || 'Invalid Day';
}
