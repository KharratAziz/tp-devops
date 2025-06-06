document.addEventListener('DOMContentLoaded', () => {
    const studentList = document.getElementById('student-list');
    const apiUrl = '/api/students'; // The proxy will redirect this to the backend API

    // Display a loading message
    studentList.innerHTML = '<li>Loading students...</li>';

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(students => {
            // Clear the loading message
            studentList.innerHTML = '';

            if (students.length === 0) {
                studentList.innerHTML = '<li>No students found.</li>';
                return;
            }

            // Populate the list with student data
            students.forEach(student => {
                const listItem = document.createElement('li');
                listItem.textContent = `${student.firstname} ${student.lastname}`;
                studentList.appendChild(listItem);
            });
        })
        .catch(error => {
            console.error('Error fetching students:', error);
            studentList.innerHTML = `<li>Error loading students. Please check the console for details.</li>`;
        });
}); 