type DateLineProps = {
  date: string;
  hideCalendarIcon?: boolean;
};

export default function DateLine({ date }: DateLineProps) {
  return (
    <div className="h-[16px] text-[12px] leading-[16px] text-white opacity-60">{date}</div>
  );
}
