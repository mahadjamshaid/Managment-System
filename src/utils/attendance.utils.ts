
export const deriveStatus = (date: Date): "Present" | "Late" => {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  return (hours > 9 || (hours === 9 && minutes > 15))
    ? "Late"
    : "Present";
};
