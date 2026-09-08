export default function Countdown({ value, className = "counter", ariaLabel }) {
  return (
    <div className={className} role="group" aria-label={ariaLabel}>
      <Cell num={value.days} label="Días" />
      <Cell num={value.hours} label="Horas" />
      <Cell num={value.minutes} label="Minutos" />
      <Cell num={value.seconds} label="Segundos" />
    </div>
  );
}

function Cell({ num, label }) {
  return (
    <div className="counter-cell">
      <span className="counter-num">{num}</span>
      <span className="counter-label">{label}</span>
    </div>
  );
}
