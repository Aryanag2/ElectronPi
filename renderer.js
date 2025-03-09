const forwardBtn = document.getElementById('forwardBtn');
const leftBtn = document.getElementById('leftBtn');
const stopBtn = document.getElementById('stopBtn');
const rightBtn = document.getElementById('rightBtn');
const backwardBtn = document.getElementById('backwardBtn');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const ipAddressInput = document.getElementById('ip-address');
const portNumberInput = document.getElementById('port-number');
const carImage = document.getElementById('car-image');
const sensorBeam = document.getElementById('sensor-beam');

const batteryValue = document.getElementById('battery');
const batteryLevel = document.getElementById('battery-level');
const temperatureValue = document.getElementById('temperature');
const distanceValue = document.getElementById('distance');
const connectionStatus = document.getElementById('connection-status');
const statusMessage = document.getElementById('status-message');

let socket = null;
let isConnected = false;
let statusInterval = null;

connectBtn.addEventListener('click', () => {
    const ipAddress = ipAddressInput.value;
    const port = parseInt(portNumberInput.value);
    
    if (!ipAddress || !port) {
        showStatusMessage('Please enter IP address and port number');
        return;
    }
    
    connectionStatus.textContent = 'Connecting...';
    statusMessage.textContent = '';
    
    try {
        if (socket) {
            socket.destroy();
            socket = null;
        }
        
        const net = require('net');
        socket = new net.Socket();
        
        socket.connect(port, ipAddress, () => {
            console.log('Connected to server');
            connectionStatus.textContent = 'Connected';
            connectionStatus.className = 'connection-value connected';
            isConnected = true;
            
            connectBtn.disabled = true;
            disconnectBtn.disabled = false;
            
            startStatusUpdates();
        });
        
        let dataBuffer = '';
        
        socket.on('data', (data) => {
            try {
                dataBuffer += data.toString();
                
                try {
                    const carState = JSON.parse(dataBuffer);
                    updateCarStatus(carState);
                    dataBuffer = '';
                } catch (parseError) {
                    console.log('Partial data received, waiting for more...');
                }
            } catch (error) {
                console.error('Error handling data from server:', error);
                showStatusMessage('Error parsing server response');
            }
        });
        
        socket.on('close', () => {
            console.log('Connection closed');
            handleDisconnect();
        });
        
        socket.on('error', (error) => {
            console.error('Socket error:', error);
            showStatusMessage(`Connection error: ${error.message}`);
            handleDisconnect();
        });
    } catch (error) {
        console.error('Error creating socket:', error);
        showStatusMessage(`Failed to connect: ${error.message}`);
        handleDisconnect();
    }
});

disconnectBtn.addEventListener('click', () => {
    if (socket && isConnected) {
        if (statusInterval) {
            clearInterval(statusInterval);
            statusInterval = null;
        }
        socket.end();
        handleDisconnect();
    }
});

forwardBtn.addEventListener('click', () => sendCommand('forward'));
leftBtn.addEventListener('click', () => sendCommand('left'));
stopBtn.addEventListener('click', () => sendCommand('stop'));
rightBtn.addEventListener('click', () => sendCommand('right'));
backwardBtn.addEventListener('click', () => sendCommand('backward'));

function sendCommand(command) {
    if (socket && isConnected) {
        try {
            socket.write(command);
            
            const btn = document.getElementById(`${command}Btn`);
            if (btn) {
                btn.classList.add('active');
                setTimeout(() => btn.classList.remove('active'), 200);
            }
        } catch (error) {
            console.error('Error sending command:', error);
            showStatusMessage(`Failed to send command: ${error.message}`);
            
            handleDisconnect();
            setTimeout(() => connectBtn.click(), 1000);
        }
    } else {
        showStatusMessage('Not connected to the car. Please connect first.');
    }
}

function startStatusUpdates() {
    if (statusInterval) {
        clearInterval(statusInterval);
    }
    
    sendCommand('status');
    
    statusInterval = setInterval(() => {
        if (isConnected) {
            sendCommand('status');
        } else {
            clearInterval(statusInterval);
        }
    }, 1000);
}

function updateCarStatus(carState) {
    console.log('Received car state:', carState);
    
    if (carState.battery !== undefined) {
        const batteryVoltage = carState.battery;
        batteryValue.textContent = `${batteryVoltage.toFixed(2)}V`;

        const batteryPercent = Math.min(100, Math.max(0, (batteryVoltage - 6.0) / 2.4 * 100));
        batteryLevel.style.width = `${batteryPercent}%`;
        
        if (batteryPercent > 60) {
            batteryLevel.style.backgroundColor = '#2ecc71'; // Green
        } else if (batteryPercent > 20) {
            batteryLevel.style.backgroundColor = '#f39c12'; // Orange
        } else {
            batteryLevel.style.backgroundColor = '#e74c3c'; // Red
        }
    }
    
    // Temperature
    if (carState.temperature !== undefined) {
        temperatureValue.textContent = `${carState.temperature.toFixed(1)}°C`;
    }
    
    // Distance to obstacle
    if (carState.obstacle_distance !== undefined) {
        const distance = carState.obstacle_distance;
        distanceValue.textContent = `${distance.toFixed(1)} cm`;
        
        updateSensorBeam(distance);
    }
    
    if (carState.direction !== undefined) {
        updateCarDirection(carState.direction);
    }
}

function updateSensorBeam(distance) {
    const maxDistance = 100;
    const beamLength = Math.min(distance, maxDistance) / maxDistance;
    
    sensorBeam.style.transform = `scaleX(${beamLength})`;
    
    if (distance < 20) {
        sensorBeam.style.backgroundColor = 'rgba(231, 76, 60, 0.8)'; // Red
    } else if (distance < 50) {
        sensorBeam.style.backgroundColor = 'rgba(243, 156, 18, 0.8)'; // Orange
    } else {
        sensorBeam.style.backgroundColor = 'rgba(46, 204, 113, 0.8)'; // Green
    }
}

function updateCarDirection(direction) {
    carImage.style.transform = 'none';
    
    switch(direction) {
        case 'left':
            carImage.style.transform = 'rotate(-20deg)';
            break;
        case 'right':
            carImage.style.transform = 'rotate(20deg)';
            break;
        case 'forward':
            carImage.style.transform = 'translateY(-10px)';
            break;
        case 'backward':
            carImage.style.transform = 'translateY(10px)';
            break;
        case 'stopped':
        default:
            break;
    }
}

function handleDisconnect() {
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
    
    if (socket) {
        try {
            socket.destroy();
        } catch (error) {
            console.error('Error destroying socket:', error);
        }
    }
    
    socket = null;
    isConnected = false;
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.className = 'connection-value';
    
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
}

function showStatusMessage(message) {
    statusMessage.textContent = message;
    console.log('Status message:', message);
    
    setTimeout(() => {
        if (statusMessage.textContent === message) {
            statusMessage.textContent = '';
        }
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    const savedIp = localStorage.getItem('picarIpAddress');
    if (savedIp) {
        ipAddressInput.value = savedIp;
    }
    
    ipAddressInput.addEventListener('change', () => {
        localStorage.setItem('picarIpAddress', ipAddressInput.value);
    });
});
