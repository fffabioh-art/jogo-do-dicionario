import React from 'react';

export interface StickmanFigureProps {
  avatarId?: string;
  color?: string;
  state?: 'running' | 'idle' | 'celebrating' | 'standing';
  size?: number; // size in px, default 40
  className?: string;
  showCrown?: boolean;
}

// 24 varied stick figures: hats, animals, and diverse accessories (no text names required)
export const STICKMAN_PRESETS = [
  { id: 'palito_classico' },
  { id: 'palito_cartola' },
  { id: 'palito_gato' },
  { id: 'palito_coelho' },
  { id: 'palito_urso' },
  { id: 'palito_sapo' },
  { id: 'palito_chifrinho' },
  { id: 'palito_alien' },
  { id: 'palito_mago' },
  { id: 'palito_pirata' },
  { id: 'palito_festa' },
  { id: 'palito_chef' },
  { id: 'palito_bone' },
  { id: 'palito_sombrero' },
  { id: 'palito_ninja' },
  { id: 'palito_coroa' },
  { id: 'palito_halo' },
  { id: 'palito_flor' },
  { id: 'palito_oculos' },
  { id: 'palito_bigode' },
  { id: 'palito_gravata' },
  { id: 'palito_capa' },
  { id: 'palito_fone' },
  { id: 'palito_raio' },
];

/**
 * Normalizes legacy emoji avatar strings into a matching stickman preset.
 */
export function getStickmanIdFromAvatar(avatar?: string): string {
  if (!avatar) return 'palito_classico';
  if (avatar.startsWith('palito_')) return avatar;

  const map: Record<string, string> = {
    '🎩': 'palito_cartola',
    '🐱': 'palito_gato',
    '🐰': 'palito_coelho',
    '🐻': 'palito_urso',
    '🐸': 'palito_sapo',
    '😈': 'palito_chifrinho',
    '👽': 'palito_alien',
    '🧙‍♂️': 'palito_mago',
    '🏴‍☠️': 'palito_pirata',
    '🥳': 'palito_festa',
    '👨‍🍳': 'palito_chef',
    '🤠': 'palito_sombrero',
    '🥷': 'palito_ninja',
    '😇': 'palito_halo',
    '🎧': 'palito_fone',
    '✨': 'palito_flor',
    '📖': 'palito_classico',
    '🌿': 'palito_ninja',
    '🎭': 'palito_capa',
    '📜': 'palito_oculos',
    '🌸': 'palito_flor',
    '🌊': 'palito_bone',
    '🌾': 'palito_gravata',
    '🎨': 'palito_bigode',
    '👑': 'palito_coroa',
    '⚡': 'palito_raio',
    '👓': 'palito_oculos',
    '🎓': 'palito_cartola',
    '🦁': 'palito_urso',
    '🦊': 'palito_gato',
    '🦉': 'palito_oculos',
    '🚀': 'palito_raio',
  };

  return map[avatar] || 'palito_classico';
}

export const StickmanFigure: React.FC<StickmanFigureProps> = ({
  avatarId = 'palito_classico',
  color = '#F59E0B',
  state = 'running',
  size = 40,
  className = '',
  showCrown = false,
}) => {
  const normId = getStickmanIdFromAvatar(avatarId);

  // Height is slightly taller to keep natural 48:56 proportion
  const height = Math.round(size * 1.15);

  const isRunning = state === 'running';
  const isCelebrating = state === 'celebrating';

  return (
    <div
      className={`inline-block relative select-none shrink-0 ${className}`}
      style={{ width: size, height }}
    >
      <svg
        viewBox="0 0 48 56"
        width={size}
        height={height}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <g className={isRunning ? 'stickman-runner-body' : isCelebrating ? 'stickman-celebrate' : ''}>
          {/* CROWN (IF 1ST PLACE OR palito_coroa) */}
          {(showCrown || normId === 'palito_coroa') && (
            <g transform="translate(14, 0)">
              <polygon
                points="0,8 3,2 10,6 17,2 20,8"
                fill="#F59E0B"
                stroke="#D97706"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <circle cx="3" cy="2" r="1" fill="#EF4444" />
              <circle cx="10" cy="5" r="1" fill="#3B82F6" />
              <circle cx="17" cy="2" r="1" fill="#10B981" />
            </g>
          )}

          {/* ACCESSORIES - HEAD & HATS & ANIMALS */}
          {normId === 'palito_cartola' && (
            <g>
              <rect x="18" y="1" width="12" height="8" fill={color} rx="1" stroke="#1c1917" strokeWidth="0.8" />
              <line x1="14" y1="9" x2="34" y2="9" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}

          {/* CAT EARS & WHISKERS */}
          {normId === 'palito_gato' && (
            <g>
              <g stroke={color} strokeWidth="1" strokeLinejoin="round" fill={color}>
                <polygon points="17,8 19,2 23,7" />
                <polygon points="25,7 29,2 31,8" />
              </g>
              <polygon points="18,7 19.5,3.5 22,7" fill="#F472B6" />
              <polygon points="26,7 28.5,3.5 30,7" fill="#F472B6" />
              <g stroke={color} strokeWidth="0.9" strokeLinecap="round">
                <line x1="14" y1="13" x2="19" y2="14" />
                <line x1="14" y1="16" x2="19" y2="15" />
                <line x1="34" y1="13" x2="29" y2="14" />
                <line x1="34" y1="16" x2="29" y2="15" />
              </g>
            </g>
          )}

          {/* BUNNY EARS */}
          {normId === 'palito_coelho' && (
            <g stroke="#1c1917" strokeWidth="0.6">
              <path d="M 18 7 C 16 0, 18 -5, 20.5 -5 C 23 -5, 23 2, 21 7 Z" fill={color} />
              <path d="M 27 7 C 25 2, 25 -5, 27.5 -5 C 30 -5, 32 0, 30 7 Z" fill={color} />
              <path d="M 19 5 C 18 1, 19 -3, 20.5 -3 C 21.5 -3, 22 2, 20.5 5 Z" fill="#F472B6" />
              <path d="M 27.5 5 C 26 2, 26.5 -3, 27.5 -3 C 28.5 -3, 29.5 1, 28.5 5 Z" fill="#F472B6" />
            </g>
          )}

          {/* BEAR ROUND EARS */}
          {normId === 'palito_urso' && (
            <g stroke="#1c1917" strokeWidth="0.6">
              <circle cx="16" cy="6" r="4.2" fill={color} />
              <circle cx="32" cy="6" r="4.2" fill={color} />
              <circle cx="16" cy="6" r="2.2" fill="#F472B6" />
              <circle cx="32" cy="6" r="2.2" fill="#F472B6" />
            </g>
          )}

          {/* FROG EYES */}
          {normId === 'palito_sapo' && (
            <g stroke="#15803D" strokeWidth="0.8">
              <circle cx="18" cy="6" r="4.2" fill="#22C55E" />
              <circle cx="30" cy="6" r="4.2" fill="#22C55E" />
              <circle cx="18" cy="6" r="2.6" fill="#FFFFFF" />
              <circle cx="30" cy="6" r="2.6" fill="#FFFFFF" />
              <circle cx="18.5" cy="5.8" r="1.3" fill="#000000" />
              <circle cx="30.5" cy="5.8" r="1.3" fill="#000000" />
            </g>
          )}

          {/* DEVIL / IMP HORNS */}
          {normId === 'palito_chifrinho' && (
            <g fill="#EF4444" stroke="#B91C1C" strokeWidth="0.8">
              <path d="M 18 8 Q 15 2 12 3 Q 16 6 19 9 Z" />
              <path d="M 30 8 Q 33 2 36 3 Q 32 6 29 9 Z" />
            </g>
          )}

          {/* ALIEN ANTENNA */}
          {normId === 'palito_alien' && (
            <g stroke={color} strokeWidth="1.8" strokeLinecap="round">
              <path d="M 24 6 Q 22 0 25 -3" fill="none" />
              <circle cx="25" cy="-3.5" r="2.8" fill="#22C55E" stroke="#15803D" strokeWidth="0.8" />
            </g>
          )}

          {/* WIZARD HAT */}
          {normId === 'palito_mago' && (
            <g fill="#6366F1" stroke="#4338CA" strokeWidth="0.8">
              <polygon points="18,7 24,-6 30,7" />
              <ellipse cx="24" cy="7" rx="11" ry="2.5" />
              <circle cx="24" cy="-1" r="1.5" fill="#FBBF24" stroke="none" />
            </g>
          )}

          {/* PIRATE TRICORN */}
          {normId === 'palito_pirata' && (
            <g fill="#18181b" stroke="#71717a" strokeWidth="0.8">
              <path d="M 13 8 Q 24 -1 35 8 Q 24 5 13 8 Z" />
              <polygon points="24,1 27,6 21,6" fill="#DC2626" />
            </g>
          )}

          {/* PARTY CONE HAT */}
          {normId === 'palito_festa' && (
            <g>
              <polygon points="19,7 24,-5 29,7" fill="#F43F5E" stroke="#E11D48" strokeWidth="0.8" />
              <circle cx="24" cy="-5" r="2.2" fill="#FBBF24" />
              <line x1="21" y1="3" x2="27" y2="3" stroke="#FBBF24" strokeWidth="1.2" />
            </g>
          )}

          {/* CHEF TOQUE */}
          {normId === 'palito_chef' && (
            <g fill="#F8FAFC" stroke="#94A3B8" strokeWidth="0.8">
              <rect x="18" y="4" width="12" height="4" rx="0.5" />
              <circle cx="20" cy="1" r="3.5" />
              <circle cx="24" cy="-1" r="4" />
              <circle cx="28" cy="1" r="3.5" />
            </g>
          )}

          {/* BASEBALL CAP */}
          {normId === 'palito_bone' && (
            <g>
              <path d="M 18 8 Q 24 3 30 8 Z" fill={color} />
              <line x1="28" y1="7" x2="37" y2="5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}

          {/* SOMBRERO */}
          {normId === 'palito_sombrero' && (
            <g fill="#D97706" stroke="#92400E" strokeWidth="0.8">
              <ellipse cx="24" cy="7" rx="14" ry="3.5" />
              <path d="M 20 7 Q 24 0 28 7 Z" />
            </g>
          )}

          {/* NINJA HEADBAND & TAILS */}
          {normId === 'palito_ninja' && (
            <g>
              <rect x="16.5" y="8" width="15" height="3" rx="0.5" fill="#DC2626" />
              <path d="M 31 10 Q 36 9 39 14" stroke="#DC2626" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M 31 10 Q 38 12 37 17" stroke="#DC2626" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </g>
          )}

          {/* ANGEL HALO */}
          {normId === 'palito_halo' && (
            <ellipse cx="24" cy="1" rx="9" ry="2.6" stroke="#FBBF24" strokeWidth="1.8" fill="none" />
          )}

          {/* FLOWER */}
          {normId === 'palito_flor' && (
            <g transform="translate(30, 4)">
              <circle cx="0" cy="0" r="3.2" fill="#EC4899" />
              <circle cx="0" cy="0" r="1.3" fill="#FEF08A" />
            </g>
          )}

          {/* DJ HEADPHONES */}
          {normId === 'palito_fone' && (
            <g stroke={color} strokeWidth="1.8" fill="none">
              <path d="M 16 13 A 8 8 0 0 1 32 13" />
              <rect x="14" y="10" width="3.5" height="7" rx="1.5" fill={color} stroke="#1c1917" strokeWidth="0.5" />
              <rect x="30.5" y="10" width="3.5" height="7" rx="1.5" fill={color} stroke="#1c1917" strokeWidth="0.5" />
            </g>
          )}

          {/* SUPERHERO CAPE */}
          {normId === 'palito_capa' && (
            <path
              d={
                isRunning
                  ? 'M 23 22 Q 10 26 5 36 Q 14 34 23 28 Z'
                  : 'M 23 22 Q 14 26 12 38 Q 18 36 23 28 Z'
              }
              fill={color}
              opacity="0.75"
              className={isRunning ? 'stickman-cape-flutter' : ''}
            />
          )}

          {/* HEAD CIRCLE */}
          <circle
            cx="24"
            cy="13"
            r="7.5"
            stroke={color}
            strokeWidth="3.2"
            fill="#1c1917"
          />

          {/* EYES */}
          {normId === 'palito_oculos' ? (
            <g>
              <circle cx="21" cy="12" r="2.6" stroke={color} strokeWidth="1.2" fill="#000" />
              <circle cx="27" cy="12" r="2.6" stroke={color} strokeWidth="1.2" fill="#000" />
              <line x1="23.6" y1="12" x2="24.4" y2="12" stroke={color} strokeWidth="1.5" />
            </g>
          ) : normId === 'palito_pirata' ? (
            <g>
              <line x1="17" y1="9" x2="25" y2="15" stroke="#000" strokeWidth="1" />
              <circle cx="21" cy="12" r="2.6" fill="#000" stroke={color} strokeWidth="0.8" />
              <circle cx="27" cy="12" r="1.3" fill={color} />
            </g>
          ) : (
            <g fill={color}>
              <circle cx="21" cy="12" r="1.3" />
              <circle cx="27" cy="12" r="1.3" />
            </g>
          )}

          {/* MOUTH & MUSTACHE */}
          {normId === 'palito_bigode' ? (
            <path
              d="M 19 15.5 Q 24 13.5 24 15.5 Q 24 13.5 29 15.5"
              stroke={color}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M 21.5 15 Q 24 17.5 26.5 15"
              stroke={color}
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* TORSO */}
          <line
            x1="24"
            y1="20.5"
            x2="24"
            y2="36"
            stroke={color}
            strokeWidth="3.6"
            strokeLinecap="round"
          />

          {/* ACCESSORIES - CHEST */}
          {normId === 'palito_gravata' && (
            <g transform="translate(24, 22)">
              <polygon points="-4,-2 4,-2 0,0" fill="#84CC16" />
              <polygon points="-4,2 4,2 0,0" fill="#84CC16" />
            </g>
          )}

          {normId === 'palito_raio' && (
            <polygon
              points="23.5,23 26.5,23 24.5,28 27.5,28 22.5,35 23.5,29 21.5,29"
              fill="#FBBF24"
              stroke="#D97706"
              strokeWidth="0.5"
            />
          )}

          {/* ARMS */}
          {isCelebrating ? (
            /* Celebrating arms raised up in victory \o/ */
            <g stroke={color} strokeWidth="3.2" strokeLinecap="round">
              <line x1="24" y1="23" x2="14" y2="11" />
              <line x1="24" y1="23" x2="34" y2="11" />
            </g>
          ) : isRunning ? (
            /* Animated running arms */
            <g stroke={color} strokeWidth="3.2" strokeLinecap="round">
              <g className="stickman-arm-left">
                <line x1="24" y1="23" x2="16" y2="30" />
                <line x1="16" y1="30" x2="11" y2="24" />
              </g>
              <g className="stickman-arm-right">
                <line x1="24" y1="23" x2="32" y2="30" />
                <line x1="32" y1="30" x2="37" y2="25" />
              </g>
            </g>
          ) : (
            /* Standing / Idle arms */
            <g stroke={color} strokeWidth="3.2" strokeLinecap="round">
              <line x1="24" y1="23" x2="16" y2="31" />
              <line x1="24" y1="23" x2="32" y2="31" />
            </g>
          )}

          {/* LEGS */}
          {isCelebrating ? (
            /* Celebrating legs apart */
            <g stroke={color} strokeWidth="3.4" strokeLinecap="round">
              <line x1="24" y1="36" x2="17" y2="52" />
              <line x1="24" y1="36" x2="31" y2="52" />
            </g>
          ) : isRunning ? (
            /* Animated running legs */
            <g stroke={color} strokeWidth="3.4" strokeLinecap="round">
              <g className="stickman-leg-left">
                <line x1="24" y1="36" x2="15" y2="44" />
                <line x1="15" y1="44" x2="10" y2="52" />
              </g>
              <g className="stickman-leg-right">
                <line x1="24" y1="36" x2="33" y2="44" />
                <line x1="33" y1="44" x2="38" y2="52" />
              </g>
            </g>
          ) : (
            /* Standing legs */
            <g stroke={color} strokeWidth="3.4" strokeLinecap="round">
              <line x1="24" y1="36" x2="18" y2="52" />
              <line x1="24" y1="36" x2="30" y2="52" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
