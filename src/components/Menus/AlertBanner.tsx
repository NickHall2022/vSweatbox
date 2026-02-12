export default function AlertBanner({
  text,
  severity,
}: {
  text: string;
  severity?: 'success' | 'error' | 'warning';
}) {
  let backgroundColor, borderColor;
  switch (severity) {
    case 'error':
      backgroundColor = '#ff000028';
      borderColor = 'red';
      break;
    case 'warning':
      backgroundColor = '#ffee0028';
      borderColor = '#ffee00c4';
      break;
  }

  return (
    <div
      style={{
        backgroundColor: backgroundColor,
        height: '50px',
        borderRadius: '5px',
        border: `1px solid ${borderColor}`,
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0px 10px',
      }}
    >
      <b>{text}</b>
    </div>
  );
}
