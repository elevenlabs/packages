interface FlagProps {
  flagCode: string;
}

export function Flag({ flagCode }: FlagProps) {
  return (
    <img
      className="w-6 h-6 rounded-full object-cover"
      src={`https://purecatamphetamine.github.io/country-flag-icons/1x1/${flagCode.toUpperCase()}.svg`}
      alt={`${flagCode.toUpperCase()} flag`}
    />
  );
}
