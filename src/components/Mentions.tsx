import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  echapperRegex, FIN_DE_TAG, MAX_MENTIONS, mentionsPresentes,
  rechercherPseudos, SuggestionPseudo, tagDe,
} from '../hooks/useMentions';
import { Mention } from '../types';
import './Mentions.css';

// Tags @pseudonyme (19/10/2026) — deux composants :
// - ZoneSaisieMentions : remplace un <textarea> classique. Taper « @ »
//   puis le début d'un pseudo affiche des suggestions ; un clic insère le
//   tag (« @PélicanToulouse ») et enregistre la personne choisie.
// - TexteAvecMentions : affiche un texte en mettant en couleur les tags
//   réellement choisis (sans lien : il n'existe pas de page profil
//   publique).

interface ZoneProps {
  value: string;
  onChange: (valeur: string) => void;
  mentions: Mention[];
  onMentionsChange: (mentions: Mention[]) => void;
  // L'auteur ne se voit jamais proposé lui-même.
  exclureUid?: string;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
}

export function ZoneSaisieMentions({
  value, onChange, mentions, onMentionsChange, exclureUid, placeholder, rows, autoFocus,
}: ZoneProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Texte tapé après le « @ » en cours, ou null s'il n'y a pas de tag en
  // cours de saisie juste avant le curseur.
  const [recherche, setRecherche] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionPseudo[]>([]);
  const [chargement, setChargement] = useState(false);

  const presentes = mentionsPresentes(value, mentions);
  const limiteAtteinte = presentes.length >= MAX_MENTIONS;
  const uidsPresents = presentes.map((m) => m.uid).join(',');

  const detecter = (texte: string, curseur: number | null) => {
    const avant = texte.slice(0, curseur ?? texte.length);
    const trouve = avant.match(/(^|\s)@([^\s@]*)$/);
    setRecherche(trouve ? trouve[2] : null);
  };

  useEffect(() => {
    if (recherche === null || limiteAtteinte || recherche.length < 2) {
      setSuggestions([]);
      setChargement(false);
      return;
    }
    let annule = false;
    setChargement(true);
    const minuteur = setTimeout(async () => {
      try {
        const exclus = uidsPresents ? uidsPresents.split(',') : [];
        if (exclureUid) exclus.push(exclureUid);
        const resultats = await rechercherPseudos(recherche, exclus);
        if (!annule) setSuggestions(resultats);
      } catch (err) {
        console.error('[ZoneSaisieMentions] recherche impossible', err);
        if (!annule) setSuggestions([]);
      } finally {
        if (!annule) setChargement(false);
      }
    }, 250);
    return () => { annule = true; clearTimeout(minuteur); };
  }, [recherche, limiteAtteinte, uidsPresents, exclureUid]);

  const choisir = (s: SuggestionPseudo) => {
    const zone = ref.current;
    const curseur = zone ? zone.selectionStart : value.length;
    const avant = value.slice(0, curseur).replace(/@[^\s@]*$/, `${tagDe(s.pseudo)} `);
    const nouveauTexte = avant + value.slice(curseur);
    onChange(nouveauTexte);
    onMentionsChange([...mentions.filter((m) => m.uid !== s.uid), { uid: s.uid, pseudo: s.pseudo }]);
    setRecherche(null);
    setSuggestions([]);
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.focus();
        ref.current.setSelectionRange(avant.length, avant.length);
      }
    });
  };

  const afficherPanneau = recherche !== null;

  return (
    <div className="mentions-zone">
      <textarea
        ref={ref}
        value={value}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        onChange={(e) => {
          onChange(e.target.value);
          detecter(e.target.value, e.target.selectionStart);
        }}
        onClick={(e) => detecter(e.currentTarget.value, e.currentTarget.selectionStart)}
        onKeyUp={(e) => detecter(e.currentTarget.value, e.currentTarget.selectionStart)}
        onBlur={() => setTimeout(() => setRecherche(null), 200)}
      />

      {afficherPanneau && (
        limiteAtteinte ? (
          <div className="mentions-panneau">
            <p className="mentions-info">{MAX_MENTIONS} pseudos maximum par texte.</p>
          </div>
        ) : recherche !== null && recherche.length < 2 ? (
          <div className="mentions-panneau">
            <p className="mentions-info">Écris l'oiseau puis la ville, sans espace : @PélicanToulouse</p>
          </div>
        ) : suggestions.length > 0 ? (
          <ul className="mentions-panneau" role="listbox">
            {suggestions.map((s) => (
              <li key={s.uid}>
                <button
                  type="button"
                  className="mentions-option"
                  // onMouseDown + preventDefault : le choix est pris en
                  // compte avant que la zone de texte ne perde le focus.
                  onMouseDown={(e) => { e.preventDefault(); choisir(s); }}
                >
                  <span className="mentions-option-tag">{tagDe(s.pseudo)}</span>
                  <span className="mentions-option-pseudo">{s.pseudo}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : !chargement ? (
          <div className="mentions-panneau">
            <p className="mentions-info">Aucun pseudo trouvé.</p>
          </div>
        ) : null
      )}
    </div>
  );
}

export function TexteAvecMentions({ texte, mentions }: { texte: string; mentions?: Mention[] }) {
  if (!texte || !mentions || mentions.length === 0) return <>{texte}</>;
  const tags = [...new Set(mentions.filter((m) => m && m.pseudo).map((m) => tagDe(m.pseudo)))]
    .sort((a, b) => b.length - a.length);
  if (tags.length === 0) return <>{texte}</>;

  const motif = new RegExp(`(${tags.map(echapperRegex).join('|')})${FIN_DE_TAG}`, 'gu');
  const morceaux: ReactNode[] = [];
  let dernier = 0;
  let trouve: RegExpExecArray | null;
  while ((trouve = motif.exec(texte)) !== null) {
    if (trouve.index > dernier) morceaux.push(texte.slice(dernier, trouve.index));
    morceaux.push(<span key={trouve.index} className="mention-tag">{trouve[0]}</span>);
    dernier = trouve.index + trouve[0].length;
  }
  if (dernier < texte.length) morceaux.push(texte.slice(dernier));
  return <>{morceaux}</>;
}
