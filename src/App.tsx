import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './App.css';

interface Attendee {
  Timestamp: string;
  "Email Address": string;
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchBy, setSearchBy] = useState< 'name' | 'email' | 'uniqueId'>('name');
  const buttonRef = useRef(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [checkedAttendees, setCheckedAttendees] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false); // New loading state
  const [allNames, setAllNames] = useState<string[]>([]); // New state for all names
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  // Replace with your deployed Google Apps Script doGet URL

  const doGetWebAppUrl = 'https://script.google.com/macros/s/AKfycbzXpAIA5q2tpUhHxewJoobLwCb7GGQj-iuHc_9iBOiO-I6_MtwJiHQeDp2hY_u5crSS/exec';
  // Replace with your deployed Google Apps Script doPost URL
  const doPostWebAppUrl = 'https://script.google.com/macros/s/AKfycbzXpAIA5q2tpUhHxewJoobLwCb7GGQj-iuHc_9iBOiO-I6_MtwJiHQeDp2hY_u5crSS/exec';

  useEffect(() => {
    const fetchAllNames = async () => {
      try {
        const response = await fetch(`${doGetWebAppUrl}?name=ALL`);
        const data = await response.json();
        if (data.status === 'success') {
          setAllNames(data.names); // Get unique names
        } else {
          console.error('Error fetching all names:', data.message);
        }
      } catch (error) {
        console.error('Error fetching all names:', error);
      }
    };

    fetchAllNames();
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlUniqueId = params.get('uniqueId');
    const urlName = params.get('name');
    const urlEmail = params.get('email');

    if (urlUniqueId) {
      setSearchTerm(urlUniqueId);
      setSearchBy('uniqueId');
      fetchAttendees('uniqueId', urlUniqueId);
    } else if (urlName) {
      setSearchTerm(urlName);
      setSearchBy('name');
      fetchAttendees('name', urlName);
    } else if (urlEmail) {
      setSearchTerm(urlEmail);
      setSearchBy('email');
      fetchAttendees('email', urlEmail);
    }
  }, [location.search]);

  const fetchAttendees = async (criteria: 'name' | 'email' | 'uniqueId', term: string) => {
    setMessage('');
    if (!term) {
      setMessage(`Please enter a ${criteria === 'uniqueId' ? 'Unique ID' : criteria === 'name' ? 'Name' : 'Email Address'}.`);
      return;
    }

    if (criteria === 'name' && term === 'ALL') {
      setMessage('Name not found.');
      return;
    }

    setIsLoading(true); // Set loading to true before fetching
    try {
      const response = await fetch(`${doGetWebAppUrl}?${criteria}=${term}`);
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

  // Handle key press on input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission if inside a form
      setShowSuggestions(false);
      fetchAttendees(searchBy, searchTerm);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    if (searchBy === 'name' && value.trim()) {
      const filtered = allNames.filter((name) =>
        name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (name: string) => {
    setSearchTerm(name);
    setShowSuggestions(false);
    // fetchAttendees('name', name);
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
        //redirect: 'follow',
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        },
        body: JSON.stringify({ uniqueIds: checkedAttendees }),
      });
      const data = await response.json();

      if (data.status === 'success') {
        setMessage(data.message);
        await fetchAttendees(searchBy, searchTerm); // Optionally, refetch attendees to update their status
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
      <h1>Check-In</h1>
      {!location.search && (
        <div className="input-section">
          <div className="select-wrapper">
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value as 'name' | 'email')}
              className="search-by-dropdown"
            >
              <option value="name">Name</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div className="autocomplete-container">
            <input
              ref={inputRef}
              type="text"
              placeholder={searchBy === 'email' ? 'Enter Email Address' : 'Enter Name'}
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {filteredSuggestions.map((name) => (
                  <div
                    key={name}
                    className="autocomplete-item"
                    onClick={() => handleSuggestionClick(name)}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button ref={buttonRef} onClick={() => fetchAttendees(searchBy, searchTerm)}>Fetch Attendees</button>
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
          <h2>Attendees</h2>
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
