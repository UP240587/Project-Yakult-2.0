import { XStack, type XStackProps } from 'tamagui';
import { AppText } from './AppText';

type Tone = 'success' | 'danger' | 'info' | 'warning' | 'master' | 'neutral';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: '$successSoft', fg: '$successInk' },
  danger:  { bg: '$dangerSoft',  fg: '$dangerInk' },
  info:    { bg: '$infoSoft',    fg: '$infoInk' },
  warning: { bg: '$warningSoft', fg: '$warningInk' },
  master:  { bg: '$masterSoft',  fg: '$masterInk' },
  neutral: { bg: '$field',       fg: '$muted' },
};

type Props = XStackProps & {
  tone?: Tone;
  /** Color hex directo: fondo al 13% y texto al 100% (para estados dinámicos). */
  color?: string;
  children: React.ReactNode;
};

// Etiqueta de estado/rol en forma de pill.
export function Badge({ tone = 'neutral', color, children, ...rest }: Props) {
  const bg = color ? `${color}22` : TONES[tone].bg;
  const fg = color ?? TONES[tone].fg;

  return (
    <XStack
      alignSelf="flex-start"
      paddingHorizontal={10}
      paddingVertical={3}
      borderRadius={20}
      backgroundColor={bg}
      {...rest}
    >
      <AppText fontSize={11} fontWeight="700" color={fg}>
        {children}
      </AppText>
    </XStack>
  );
}
