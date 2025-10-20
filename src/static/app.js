document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
  // cache-busting to ensure we get the latest server state
  const response = await fetch(`/activities?_=${Date.now()}`, { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message and reset select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML
        const participantsArray = details.participants || [];
        let participantsHTML = '<div class="participants"><h5>Participants</h5>';

        if (participantsArray.length === 0) {
          participantsHTML += '<p class="info">No participants yet.</p>';
        } else {
          participantsHTML += '<ul class="participants-list">';
          participantsArray.forEach((email) => {
            // derive simple initials from local-part
            const localPart = (email || "").split("@")[0] || "";
            const initials = localPart
              .split(/[\._\-]/)
              .map((s) => s.charAt(0))
              .join("")
              .slice(0, 2)
              .toUpperCase();

            // include a delete button to unregister the participant
            participantsHTML += `<li data-email="${email}" data-activity="${name}"><span class="participant-badge">${initials}</span><span class="participant-email">${email}</span><button class="participant-delete" title="Unregister ${email}" aria-label="Unregister ${email}">&times;</button></li>`;
          });
          participantsHTML += "</ul>";
        }

        participantsHTML += "</div>";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // attach delete handlers after DOM is updated
      document.querySelectorAll('.participant-delete').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const li = e.currentTarget.closest('li');
          const email = li.getAttribute('data-email');
          const activity = li.getAttribute('data-activity');

          if (!email || !activity) return;

          // optimistic UI: disable button while request in progress
          e.currentTarget.disabled = true;

          try {
            const res = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, {
              method: 'POST'
            });

            const json = await res.json();

            if (res.ok) {
              // remove the participant li from the DOM
              li.remove();

              // Refresh activities to keep UI consistent (update availability counts, etc.)
              await fetchActivities();
            } else {
              console.error('Failed to unregister:', json);
              alert(json.detail || json.message || 'Failed to unregister participant');
              e.currentTarget.disabled = false;
            }
          } catch (err) {
            console.error('Error unregistering participant:', err);
            alert('Failed to unregister participant');
            e.currentTarget.disabled = false;
          }
        });
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

  // Refresh activities to show the new participant
  await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
