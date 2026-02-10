
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DateTimePickerProps {
    value: string; // ISO string
    onChange: (value: string) => void;
}

export default function DateTimePicker({ value, onChange }: DateTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date()); // For navigation
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                setSelectedDate(date);
                setViewDate(date);
            }
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const handleDateClick = (day: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        // Preserve time if already selected
        if (selectedDate) {
            newDate.setHours(selectedDate.getHours());
            newDate.setMinutes(selectedDate.getMinutes());
        } else {
            newDate.setHours(12, 0); // Default to noon
        }
        setSelectedDate(newDate);
        onChange(newDate.toISOString());
    };

    const handleTimeClick = (hour: number) => {
        if (!selectedDate) return;
        const newDate = new Date(selectedDate);
        newDate.setHours(hour);
        setSelectedDate(newDate);
        onChange(newDate.toISOString());
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
        setViewDate(newDate);
    };

    const renderCalendar = () => {
        const days = [];
        const totalDays = daysInMonth(viewDate);
        const startDay = firstDayOfMonth(viewDate); // 0 = Sunday

        // Empty slots for start of month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
        }

        for (let i = 1; i <= totalDays; i++) {
            const isSelected = selectedDate &&
                selectedDate.getDate() === i &&
                selectedDate.getMonth() === viewDate.getMonth() &&
                selectedDate.getFullYear() === viewDate.getFullYear();

            const isToday = new Date().getDate() === i &&
                new Date().getMonth() === viewDate.getMonth() &&
                new Date().getFullYear() === viewDate.getFullYear();

            days.push(
                <button
                    key={i}
                    onClick={() => handleDateClick(i)}
                    className={`h-8 w-8 rounded-full text-xs font-bold transition-colors
                        ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-white/10 text-gray-300'}
                        ${isToday && !isSelected ? 'border border-blue-500 text-blue-400' : ''}
                    `}
                >
                    {i}
                </button>
            );
        }
        return days;
    };

    const renderTimeList = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        return hours.map(h => (
            <button
                key={h}
                onClick={() => handleTimeClick(h)}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-white/10 transition-colors
                    ${selectedDate?.getHours() === h ? 'bg-blue-500 text-white' : 'text-gray-300'}
                `}
            >
                {h.toString().padStart(2, '0')}:00
            </button>
        ));
    };

    const formatDisplay = (val: string) => {
        if (!val) return '';
        const d = new Date(val);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="relative" ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-3 bg-white/5 border border-white/10 rounded text-white focus:border-gold outline-none cursor-pointer flex justify-between items-center"
            >
                <span className={!value ? 'text-gray-500' : ''}>
                    {value ? formatDisplay(value) : 'Selecione a data e hora'}
                </span>
                <CalendarIcon size={16} className="text-gray-400" />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-gray-900 border border-white/10 rounded-xl shadow-2xl flex overflow-hidden w-full md:w-[400px]">
                    {/* Calendar Section */}
                    <div className="p-4 bg-gray-900 flex-1 border-r border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={() => changeMonth(-1)} className="p-1 hover:text-white text-gray-400"><ChevronLeft size={16} /></button>
                            <span className="font-bold text-sm text-white capitalize">
                                {viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={() => changeMonth(1)} className="p-1 hover:text-white text-gray-400"><ChevronRight size={16} /></button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                                <span key={d} className="text-[10px] uppercase text-gray-500 font-bold">{d}</span>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1 place-items-center">
                            {renderCalendar()}
                        </div>
                    </div>

                    {/* Time Section */}
                    <div className="w-24 bg-black/20 overflow-y-auto max-h-[300px] border-l border-white/5">
                        <div className="p-2 text-[10px] uppercase text-gray-500 font-bold text-center border-b border-white/5 bg-gray-900 sticky top-0">
                            Hora
                        </div>
                        {renderTimeList()}
                    </div>
                </div>
            )}
        </div>
    );
}
