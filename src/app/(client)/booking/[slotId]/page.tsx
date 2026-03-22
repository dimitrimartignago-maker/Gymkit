export default function BookingSlotPage({ params }: { params: { slotId: string } }) {
  return <h1>Dettaglio Slot — {params.slotId}</h1>;
}
