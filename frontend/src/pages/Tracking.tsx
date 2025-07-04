import { useState, useRef } from 'react';

const Tracking = () => {
    const [orderNumber, setOrderNumber] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [weight, setWeight] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const orderNumberInputRef = useRef<HTMLInputElement>(null);

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

            const response = await fetch('https://8def-2401-4900-8827-18db-d531-34b1-a4f4-2ef9.ngrok-free.app/api/trackingroute/update-tracking', {
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

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center pt-10">
            <div className="max-w-md w-full px-4">
                {/* Separate white box for the title */}
                <div className="bg-white shadow-md rounded-lg p-4 mb-6 text-center">
                    <h2 className="text-2xl font-bold text-black-600">InstaxBot Tracking Information</h2>
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
                
                <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
                    <div className="mb-4">
                        <label className="block text-black-700 text-sm font-bold mb-2" htmlFor="orderNumber">
                            Order Number:
                        </label>
                        <input
                            type="text"
                            id="orderNumber"
                            value={orderNumber}
                            onChange={(e) => setOrderNumber(e.target.value)}
                            className="mt-1 block w-full border-2 border-black-500 rounded-sm shadow-sm p-2 focus:ring-pink-400 focus:border-pink-400 focus:outline-none sm:text-sm"
                            required
                            ref={orderNumberInputRef}
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-black-700 text-sm font-bold mb-2" htmlFor="trackingNumber">
                            Tracking Number:
                        </label>
                        <input
                            type="text"
                            id="trackingNumber"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            className="mt-1 block w-full border-2 border-black-500 rounded-sm shadow-sm p-2 focus:ring-pink-400 focus:border-pink-400 focus:outline-none sm:text-sm"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-black-700 text-sm font-bold mb-2" htmlFor="weight">
                            Weight (gms):
                        </label>
                        <input
                            type="number"
                            id="weight"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="mt-1 block w-full border-2 border-black-500 rounded-sm shadow-sm p-2 focus:ring-pink-400 focus:border-pink-400 focus:outline-none sm:text-sm"
                            required
                        />
                    </div>
                    <div className="flex items-center justify-center">
                        <button
                            onClick={handleSubmit}
                            className="bg-white text-black px-3 py-2 rounded-sm hover:bg-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 border-2 border-pink-400 shadow-md transition duration-300 font-medium text-lg"
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