import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './App.css';

interface Attendee {
  Timestamp: string;
  Email: string;
  "Responder Name": string;
  "Number of Guests": string;
  Name: string;
  "Meal Preference": string;
  "Allergy & Restrictions": string;
  CheckIn: string;
  UniqueId: string;
  "Table No"?: string; // New field for table number
}

function App() {
  const [uniqueIdInput, setUniqueIdInput] = useState<string>('');
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [checkedAttendees, setCheckedAttendees] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false); // New loading state
  const location = useLocation();

  // Replace with your deployed Google Apps Script doGet URL
  const doGetWebAppUrl = 'https://script.google.com/macros/s/AKfycbzHvmMsw8W_DKLT9kZhCak_PujFyKOun2KcS1WqjQARd51GSDBJEMbF3qB5_lwKMeE-/exec';
  // Replace with your deployed Google Apps Script doPost URL
  const doPostWebAppUrl = 'https://script.google.com/macros/s/AKfycbzHvmMsw8W_DKLT9kZhCak_PujFyKOun2KcS1WqjQARd51GSDBJEMbF3qB5_lwKMeE-/exec';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlUniqueId = params.get('uniqueId');
    if (urlUniqueId) {
      setUniqueIdInput(urlUniqueId);
      fetchAttendees(urlUniqueId);
    }
  }, [location.search]);

  const fetchAttendees = async (id: string = uniqueIdInput) => {
    setMessage('');
    if (!id) {
      setMessage('Please enter a Unique ID.');
      return;
    }

    setIsLoading(true); // Set loading to true before fetching
    try {
      const response = await fetch(`${doGetWebAppUrl}?uniqueId=${id}`);
      const data = await response.json();

      if (data.status === 'success') {
        setAttendees(data.data);
        setCheckedAttendees([]); // Clear checkboxes on new fetch
      } else {
        setMessage(data.message);
        setAttendees([]);
      }
    } catch (error) {
      setMessage('Error fetching data.');
      console.error('Error fetching data:', error);
      setAttendees([]);
    } finally {
      setIsLoading(false); // Set loading to false after fetching (success or error)
    }
  };

  const handleCheckboxChange = (uniqueId: string) => {
    setCheckedAttendees((prevChecked) =>
      prevChecked.includes(uniqueId)
        ? prevChecked.filter((id) => id !== uniqueId)
        : [...prevChecked, uniqueId]
    );
  };

  const handleCheckIn = async () => {
    setMessage('');
    if (checkedAttendees.length === 0) {
      setMessage('Please select at least one attendee to check in.');
      return;
    }

    setIsLoading(true); // Set loading to true before checking in
    try {
      const response = await fetch(doPostWebAppUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ uniqueIds: checkedAttendees }),
      });
      const data = await response.json();

      if (data.status === 'success') {
        setMessage(data.message);
        fetchAttendees(); // Optionally, refetch attendees to update their status
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('Error submitting check-in.');
      console.error('Error submitting check-in:', error);
    } finally {
      setIsLoading(false); // Set loading to false after check-in (success or error)
    }
  };

  return (
    <div className="App">
      <h1>Attendee Check-In</h1>
      {!location.search && (
        <div className="input-section">
          <input
            type="text"
            placeholder="Enter Unique ID"
            value={uniqueIdInput}
            onChange={(e) => setUniqueIdInput(e.target.value)}
          />
          <button onClick={() => fetchAttendees()}>Fetch Attendees</button>
        </div>
      )}

      {message && <p className="message">{message}</p>}

      {isLoading && (
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      )}

      {!isLoading && attendees.length > 0 && (
        <div className="attendee-list">
          <h2>Attendees for Email: {attendees[0].Email}</h2>
          {attendees.map((attendee) => (
            <div key={attendee.UniqueId} className="attendee-item">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id={attendee.UniqueId}
                  checked={checkedAttendees.includes(attendee.UniqueId)}
                  onChange={() => handleCheckboxChange(attendee.UniqueId)}
                  disabled={attendee.CheckIn === 'Y'} // Disable if already checked in
                />
                <label htmlFor={attendee.UniqueId}>
                  {attendee.Name} ({attendee["Meal Preference"]})
                </label>
              </div>
              <div className="status-info">
                Status: {attendee.CheckIn === 'Y' ? 'Checked In' : 'Not Checked In'}
                {attendee.CheckIn === 'Y' && attendee["Table No"] && ` | Table: ${attendee["Table No"]}`}

              </div>
            </div>
          ))}
          <button onClick={handleCheckIn} disabled={checkedAttendees.length === 0}>
            Check-In Selected
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
