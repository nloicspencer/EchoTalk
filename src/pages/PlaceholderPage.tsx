import './Placeholder.css';

interface Props {
  titre: string;
  description: string;
  icon: string;
}

export default function PlaceholderPage({ titre, description, icon }: Props) {
  return (
    <div className="placeholder-page">
      <span className="placeholder-icon">{icon}</span>
      <h2>{titre}</h2>
      <p>{description}</p>
    </div>
  );
}
