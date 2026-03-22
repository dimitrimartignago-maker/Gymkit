export default function WorkoutLogPage({ params }: { params: { dayId: string } }) {
  return <h1>Log Allenamento — Giorno {params.dayId}</h1>;
}
