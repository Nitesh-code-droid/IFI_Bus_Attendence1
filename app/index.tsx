import { BarcodeScanningResult, CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_FRAME_SIZE = SCREEN_WIDTH * 0.7;

export default function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');
  const [scanTime, setScanTime] = useState<string>('');
  const [facing, setFacing] = useState<CameraType>('back');
  const [isActive, setIsActive] = useState(true);

  // Lock screen orientation to portrait
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // Handle screen focus to resume camera
  useFocusEffect(
    React.useCallback(() => {
      setIsActive(true);
      return () => {
        setIsActive(false);
      };
    }, [])
  );

  const handleBarCodeScanned = ({ type, data }: BarcodeScanningResult) => {
    if (!scanned) {
      setScanned(true);
      setScannedData(data);
      
      // Get current date/time
      const now = new Date();
      const formattedTime = now.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setScanTime(formattedTime);
      
      // Show alert with scan details
      Alert.alert(
        'Barcode Scanned!',
        `Type: ${type}\nData: ${data}\n\nTime: ${formattedTime}\n\nData will be sent to server when backend is implemented.`,
        [
          { text: 'OK', onPress: () => console.log('OK Pressed') },
          { 
            text: 'Scan Again', 
            onPress: () => resetScanner(),
            style: 'default'
          }
        ]
      );
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScannedData('');
    setScanTime('');
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          We need your permission to use the camera
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isActive) {
    return (
      <View style={styles.container}>
        <Text>Camera is not active</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: [
            'qr',
            'pdf417',
            'code128',
            'code39',
            'code93',
            'codabar',
            'ean13',
            'ean8',
            'itf14',
            'upc_a',
            'upc_e',
          ],
        }}
      >
        {/* Scan Frame Overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              Position ID card barcode within the frame
            </Text>
          </View>
        </View>
      </CameraView>

      {/* Controls Panel */}
      <View style={styles.controlsContainer}>
        {scanned ? (
          <View style={styles.scanResultContainer}>
            <Text style={styles.resultTitle}>Scanned Data:</Text>
            <Text style={styles.resultData} numberOfLines={2}>
              {scannedData || 'No data'}
            </Text>
            <Text style={styles.resultTime}>Scan Time: {scanTime}</Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.scanAgainButton]}
                onPress={resetScanner}
              >
                <Text style={styles.buttonText}>Scan Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.flipButton]}
                onPress={toggleCameraFacing}
              >
                <Text style={styles.buttonText}>Flip Camera</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.noteText}>
              Note: This data will be sent to your SQL Server API when the backend is implemented.
            </Text>
          </View>
        ) : (
          <View style={styles.readyToScanContainer}>
            <Text style={styles.readyText}>Ready to Scan</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.flipButton]}
                onPress={toggleCameraFacing}
              >
                <Text style={styles.buttonText}>Flip Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE * 0.6, // Rectangle shape for ID cards
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  instructionsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  controlsContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  scanResultContainer: {
    alignItems: 'center',
  },
  readyToScanContainer: {
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  resultData: {
    fontSize: 16,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    textAlign: 'center',
    width: '100%',
    color: '#007AFF',
    fontWeight: '500',
  },
  resultTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  readyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  scanAgainButton: {
    backgroundColor: '#34C759',
  },
  flipButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});