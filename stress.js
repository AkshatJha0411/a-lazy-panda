import axios from "axios";

const EVENT_ID = "d94f44fa-29ab-4d87-a70c-77641fd77d60"; // replace with your event id

async function run() {
  const promises = [];
  for (let i = 0; i < 20; i++) {
    const body = {
      user: `testuser_${i}`,   // unique user each time
      event_id: EVENT_ID,
      tickets_to_book: 1
    };

    promises.push(
      axios.post("http://localhost:3000/api/bookings", body)
        .then(r => console.log("ok", r.data))
        .catch(e => console.log("err", e.response?.data))
    );
  }
  await Promise.all(promises);
  console.log("done");
}

run();
