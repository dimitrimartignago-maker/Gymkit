export default function RegisterPage({ params }: { params: { token: string } }) {
  return <h1>Registrazione — Invite {params.token}</h1>;
}
