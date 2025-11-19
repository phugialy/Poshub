/**
 * Simple Barcode Visual Component
 * Creates a visual barcode representation from tracking number
 * Lightweight and reusable across platforms
 */

function BarcodeVisual({ trackingNumber, height = 40 }) {
  if (!trackingNumber) return null;

  // Remove spaces for visualization
  const cleanNumber = trackingNumber.replace(/\s+/g, '');
  
  // Generate bar heights based on character (simple algorithm)
  const getBarHeight = (char, index) => {
    const code = char.charCodeAt(0);
    // Create variation based on character code
    const baseHeight = height;
    const variation = (code % 3) * 8; // 0, 8, or 16px variation
    return baseHeight + variation;
  };

  return (
    <div className="barcode-container">
      <div className="barcode-bars">
        {cleanNumber.split('').map((char, idx) => {
          const barHeight = getBarHeight(char, idx);
          const isSpace = char === ' ';
          
          return (
            <div
              key={idx}
              className={`barcode-bar ${isSpace ? 'space' : ''}`}
              style={{
                height: isSpace ? '10px' : `${barHeight}px`,
                width: isSpace ? '4px' : '3px',
                backgroundColor: isSpace ? 'transparent' : '#1f2937',
              }}
              title={char}
            />
          );
        })}
      </div>
    </div>
  );
}

export default BarcodeVisual;

