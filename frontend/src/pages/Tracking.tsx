import { useState, useRef } from 'react';

const Tracking = () => {
    const [orderNumber, setOrderNumber] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [weight, setWeight] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const orderNumberInputRef = useRef<HTMLInputElement>(null);
    const trackingNumberInputRef = useRef<HTMLInputElement>(null);
    const weightInputRef = useRef<HTMLInputElement>(null);

    // SweetAlert2 replacement functions
    const showAlert = (type: string, title: string, text: string, showConfirm: boolean = true): Promise<boolean> => {
        return new Promise((resolve) => {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';

            const bgColor = type === 'success' ? 'bg-green-50 border-green-200' :
                type === 'error' ? 'bg-red-50 border-red-200' :
                    type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-blue-50 border-blue-200';

            const iconColor = type === 'success' ? 'text-green-600' :
                type === 'error' ? 'text-red-600' :
                    type === 'warning' ? 'text-yellow-600' :
                        'text-blue-600';

            const icon = type === 'success' ? '✓' :
                type === 'error' ? '✕' :
                    type === 'warning' ? '⚠' :
                        'ℹ';

            alertDiv.innerHTML = `
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 ${bgColor} border-2">
                    <div class="text-center">
                        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full ${bgColor} mb-4">
                            <span class="text-2xl ${iconColor}">${icon}</span>
                        </div>
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>
                        <p class="text-gray-600 mb-6">${text}</p>
                        <div class="flex justify-center space-x-3">
                            ${showConfirm ? `
                                <button id="confirm-btn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    Yes
                                </button>
                                <button id="cancel-btn" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500">
                                    No
                                </button>
                            ` : `
                                <button id="ok-btn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    OK
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(alertDiv);

            const confirmBtn = alertDiv.querySelector('#confirm-btn') as HTMLButtonElement;
            const cancelBtn = alertDiv.querySelector('#cancel-btn') as HTMLButtonElement;
            const okBtn = alertDiv.querySelector('#ok-btn') as HTMLButtonElement;

            const cleanup = () => {
                document.body.removeChild(alertDiv);
            };

            if (showConfirm) {
                if (confirmBtn) {
                    confirmBtn.onclick = () => {
                        cleanup();
                        resolve(true);
                    };
                }
                if (cancelBtn) {
                    cancelBtn.onclick = () => {
                        cleanup();
                        resolve(false);
                    };
                }
            } else {
                if (okBtn) {
                    okBtn.onclick = () => {
                        cleanup();
                        resolve(true);
                    };
                }
            }
        });
    };

    const handleForceUpdate = async () => {
        const tenentId = localStorage.getItem('tenentid');
        if (!tenentId) {
            setErrorMessage('Tenent ID not found. Please log in again.');
            setTimeout(() => setErrorMessage(''), 5000);
            return;
        }

        setLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            const requestBody = {
                orderNumber: orderNumber,
                trackingNumber: trackingNumber,
                weight: parseFloat(weight),
                tenentId: tenentId,
                confirmOverride: true
            };

            const response = await fetch('https://ddcf6bc6761a.ngrok-free.app/api/trackingroute/force-update-tracking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccessMessage('Tracking information updated successfully');

                setTimeout(() => {
                    setOrderNumber('');
                    setTrackingNumber('');
                    setWeight('');
                    setSuccessMessage('');

                    if (orderNumberInputRef.current) {
                        orderNumberInputRef.current.focus();
                    }
                }, 2000);
            } else {
                setErrorMessage(data.message || 'Failed to update tracking information');
                setTimeout(() => setErrorMessage(''), 5000);
            }

        } catch (error) {
            console.error('Error updating tracking:', error);
            setErrorMessage('Network error. Please check your connection and try again.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        // Check if all fields are filled
        if (!orderNumber || !trackingNumber || !weight) {
            setErrorMessage('Please fill in all fields');
            setTimeout(() => setErrorMessage(''), 3000);
            return;
        }

        // Get tenentId from localStorage with validation
        const tenentId = localStorage.getItem('tenentid');
        if (!tenentId) {
            setErrorMessage('Tenent ID not found. Please log in again.');
            setTimeout(() => setErrorMessage(''), 5000);
            return;
        }

        setLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            // Prepare request body
            const requestBody = {
                orderNumber: orderNumber,
                trackingNumber: trackingNumber,
                weight: parseFloat(weight),
                tenentId: tenentId
            };

            const response = await fetch('https://ddcf6bc6761a.ngrok-free.app/api/trackingroute/update-tracking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccessMessage('Tracking information updated successfully');

                // Clear input fields after a short delay
                setTimeout(() => {
                    setOrderNumber('');
                    setTrackingNumber('');
                    setWeight('');
                    setSuccessMessage('');

                    // Focus back to order number input
                    if (orderNumberInputRef.current) {
                        orderNumberInputRef.current.focus();
                    }
                }, 2000);
            } else {
                // Handle different status check responses
                if (data.statusCheck) {
                    switch (data.statusCheck) {
                        case 'PAYMENT_PENDING':
                            await showAlert('warning', 'Payment Pending', 'Payment is pending for this order', false);
                            break;

                        case 'PRINT_PACK_PENDING':
                            await showAlert('warning', 'Print and Pack Required', 'You didn\'t take print and pack', false);
                            break;

                        case 'PACK_PENDING':
                            await showAlert('warning', 'Pack Required', 'You didn\'t take pack', false);
                            break;

                        case 'ALREADY_SHIPPED':
                            const confirmOverride = await showAlert(
                                'question',
                                'Order Already Shipped',
                                'You already shipped this order. Do you really want to change the data?',
                                true
                            );

                            if (confirmOverride) {
                                await handleForceUpdate();
                                return;
                            }
                            break;

                        case 'INVALID_STATUS':
                            await showAlert('error', 'Invalid Status', data.message || 'Cannot update tracking for this order status', false);
                            break;

                        default:
                            setErrorMessage(data.message || 'Failed to update tracking information');
                            setTimeout(() => setErrorMessage(''), 5000);
                    }
                } else {
                    setErrorMessage(data.message || 'Failed to update tracking information');
                    setTimeout(() => setErrorMessage(''), 5000);
                }
            }

        } catch (error) {
            console.error('Error updating tracking:', error);
            setErrorMessage('Network error. Please check your connection and try again.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setLoading(false);
        }
    };

    // Handle Enter key navigation
    const handleKeyDown = (e: React.KeyboardEvent, currentField: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            
            switch (currentField) {
                case 'orderNumber':
                    if (trackingNumberInputRef.current) {
                        trackingNumberInputRef.current.focus();
                    }
                    break;
                case 'trackingNumber':
                    if (weightInputRef.current) {
                        weightInputRef.current.focus();
                    }
                    break;
                case 'weight':
                    // Submit the form when Enter is pressed on the last field
                    handleSubmit();
                    break;
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center pt-10">
            <div className="max-w-md w-full px-4">
                {/* Separate white box for the title */}
                <div className="bg-white shadow-md rounded-lg p-4 mb-6 text-center">
                    <h2 className="text-2xl font-bold text-black">InstaxBot Tracking Information</h2>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-center">
                        {successMessage}
                    </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-center">
                        {errorMessage}
                    </div>
                )}

                <div className="bg-white shadow-md rounded-lg">
                    <div className="p-3 sm:p-6">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-black text-base font-semibold mb-2" htmlFor="orderNumber">
                                    Order Number:
                                </label>
                                <input
                                    type="text"
                                    id="orderNumber"
                                    value={orderNumber}
                                    onChange={(e) => setOrderNumber(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, 'orderNumber')}
                                    className="mt-1 block w-full border-2 border-black-500 rounded-md shadow-sm p-2 focus:ring-pink-400 focus:border-pink-400 focus:outline-none sm:text-sm"
                                    required
                                    ref={orderNumberInputRef}
                                />
                            </div>
                            <div>
                                <label className="block text-black text-base font-semibold mb-2" htmlFor="trackingNumber">
                                    Tracking Number:
                                </label>
                                <input
                                    type="text"
                                    id="trackingNumber"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, 'trackingNumber')}
                                    className="mt-1 block w-full border-2 border-black-500 rounded-md shadow-sm p-2 focus:ring-pink-400 focus:border-pink-400 focus:outline-none sm:text-sm"
                                    required
                                    ref={trackingNumberInputRef}
                                />
                            </div>
                            <div>
                                <label className="block text-black text-base font-semibold mb-2" htmlFor="weight">
                                    Weight (gms):
                                </label>
                                <input
                                    type="number"
                                    id="weight"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, 'weight')}
                                    className="mt-1 block w-full border-2 border-black-500 rounded-md shadow-sm p-2 focus:ring-pink-400 focus:border-pink-400 focus:outline-none sm:text-sm"
                                    required
                                    ref={weightInputRef}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="py-4 bg-gray-50 border-t-2 border-gray-200 rounded-b-lg flex justify-center">
                        <button
                            onClick={handleSubmit}
                            className="bg-white text-gray-800 px-4 py-2 rounded-lg font-medium text-lg border-2 border-pink-400 shadow-sm hover:bg-pink-100 hover:shadow-md transition duration-200"
                            disabled={loading}
                        >
                            {loading ? 'Updating...' : 'Update Tracking'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tracking;
