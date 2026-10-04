const prisma = require("../server/prisma");

async function main() {
  // -----------------------------
  // Instruments
  // -----------------------------
  const piano = await prisma.instrument.upsert({
    where: { name: "Piano" },
    update: {},
    create: { name: "Piano" },
  });

  const violin = await prisma.instrument.upsert({
    where: { name: "Violin" },
    update: {},
    create: { name: "Violin" },
  });

  const vocal = await prisma.instrument.upsert({
    where: { name: "Vocal" },
    update: {},
    create: { name: "Vocal" },
  });

  console.log("Instruments seeded successfully 🎵");

  // -----------------------------
  // Coach User
  // -----------------------------
  const coachUser = await prisma.user.upsert({
    where: { email: "rahul.coach@example.com" },
    update: {
      name: "Rahul Sharma",
      phone: "9876543210",
      role: "COACH",
    },
    create: {
      name: "Rahul Sharma",
      email: "rahul.coach@example.com",
      phone: "9876543210",
      role: "COACH",
    },
  });

  // -----------------------------
  // Coach Profile
  // -----------------------------
  const coach = await prisma.coachProfile.upsert({
    where: { userId: coachUser.id },
    update: {
      bio: "Experienced piano coach for beginners and intermediate students.",
      experienceYears: 5,
      hourlyRate: 500,
      isVerified: true,
      backgroundCheck: true,
    },
    create: {
      userId: coachUser.id,
      bio: "Experienced piano coach for beginners and intermediate students.",
      experienceYears: 5,
      hourlyRate: 500,
      isVerified: true,
      backgroundCheck: true,
    },
  });

  // -----------------------------
  // Coach Instrument
  // -----------------------------
  await prisma.coachInstrument.upsert({
    where: {
      coachId_instrumentId: {
        coachId: coach.id,
        instrumentId: piano.id,
      },
    },
    update: {},
    create: {
      coachId: coach.id,
      instrumentId: piano.id,
    },
  });

  // -----------------------------
  // Availability
  // -----------------------------
  await prisma.availability.deleteMany({
    where: { coachId: coach.id },
  });

  await prisma.availability.createMany({
    data: [
      {
        coachId: coach.id,
        dayOfWeek: 1,
        startTime: "17:00",
        endTime: "19:00",
      },
      {
        coachId: coach.id,
        dayOfWeek: 3,
        startTime: "17:00",
        endTime: "19:00",
      },
      {
        coachId: coach.id,
        dayOfWeek: 6,
        startTime: "10:00",
        endTime: "13:00",
      },
    ],
  });

  console.log("Coach seeded successfully 👨‍🏫");

  // -----------------------------
  // Student User
  // -----------------------------
  const studentUser = await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {
      name: "Aarav Kumar",
      phone: "9876543211",
      role: "STUDENT",
    },
    create: {
      name: "Aarav Kumar",
      email: "student@example.com",
      phone: "9876543211",
      role: "STUDENT",
    },
  });

  // -----------------------------
  // Student Profile
  // -----------------------------
  const student = await prisma.studentProfile.upsert({
    where: { userId: studentUser.id },
    update: {
      age: 14,
      skillLevel: "Beginner",
      learningGoal: "Learn piano from basics",
    },
    create: {
      userId: studentUser.id,
      age: 14,
      skillLevel: "Beginner",
      learningGoal: "Learn piano from basics",
    },
  });

  console.log("Student seeded successfully 🎓");

  // -----------------------------
  // Booking
  // -----------------------------
  let booking = await prisma.booking.findFirst({
    where: {
      studentId: student.id,
      coachId: coach.id,
      instrumentId: piano.id,
    },
  });

  if (!booking) {
    booking = await prisma.booking.create({
      data: {
        studentId: student.id,
        coachId: coach.id,
        instrumentId: piano.id,
        status: "COMPLETED",
        dayOfWeek: 1,
        startTime: "17:00",
        durationMins: 60,
        startDate: new Date("2026-10-05T11:30:00.000Z"),
        endDate: new Date("2026-10-05T12:30:00.000Z"),
      },
    });
  } else {
    booking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "COMPLETED",
        dayOfWeek: 1,
        startTime: "17:00",
        durationMins: 60,
        startDate: new Date("2026-10-05T11:30:00.000Z"),
        endDate: new Date("2026-10-05T12:30:00.000Z"),
      },
    });
  }

  console.log("Booking seeded successfully 📅");

  // -----------------------------
  // Lesson
  // -----------------------------
  let lesson = await prisma.lesson.findFirst({
    where: {
      bookingId: booking.id,
    },
  });

  if (!lesson) {
    lesson = await prisma.lesson.create({
      data: {
        bookingId: booking.id,
        date: new Date("2026-10-05T11:30:00.000Z"),
        status: "COMPLETED",
        notes: "First trial piano lesson",
        homework: "Practice C major scale for 10 minutes",
      },
    });
  } else {
    lesson = await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        date: new Date("2026-10-05T11:30:00.000Z"),
        status: "COMPLETED",
        notes: "First trial piano lesson",
        homework: "Practice C major scale for 10 minutes",
      },
    });
  }

  console.log("Lesson seeded successfully 🎹");

  // -----------------------------
  // Progress Note
  // -----------------------------
  const existingProgress = await prisma.progressNote.findFirst({
    where: { lessonId: lesson.id },
  });

  if (!existingProgress) {
    await prisma.progressNote.create({
      data: {
        lessonId: lesson.id,
        summary:
          "Student learned basic piano posture and C major scale.",
        strengths:
          "Good rhythm and quick understanding of notes.",
        improvements:
          "Needs more practice with finger positioning.",
        homework:
          "Practice C major scale for 10 minutes daily.",
      },
    });
  } else {
    await prisma.progressNote.update({
      where: { id: existingProgress.id },
      data: {
        summary:
          "Student learned basic piano posture and C major scale.",
        strengths:
          "Good rhythm and quick understanding of notes.",
        improvements:
          "Needs more practice with finger positioning.",
        homework:
          "Practice C major scale for 10 minutes daily.",
      },
    });
  }

  console.log("Progress note seeded successfully 📈");

  // -----------------------------
  // Payment
  // -----------------------------
  const existingPayment = await prisma.payment.findFirst({
    where: { bookingId: booking.id },
  });

  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: 500,
        status: "PAID",
        paymentDate: new Date("2026-10-04T09:52:30.413Z"),
        transactionId: "TXN-DEMO-001",
      },
    });
  } else {
    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        amount: 500,
        status: "PAID",
        paymentDate: new Date("2026-10-04T09:52:30.413Z"),
        transactionId: "TXN-DEMO-001",
      },
    });
  }

  console.log("Payment seeded successfully 💳");

  // -----------------------------
  // Review
  // -----------------------------
  const existingReview = await prisma.review.findFirst({
    where: { bookingId: booking.id },
  });

  if (!existingReview) {
    await prisma.review.create({
      data: {
        bookingId: booking.id,
        studentId: student.id,
        coachId: coach.id,
        rating: 5,
        comment:
          "Rahul is a great piano coach. Clear explanations and very patient.",
      },
    });
  } else {
    await prisma.review.update({
      where: { id: existingReview.id },
      data: {
        rating: 5,
        comment:
          "Rahul is a great piano coach. Clear explanations and very patient.",
      },
    });
  }

  console.log("Review seeded successfully ⭐");
  console.log("🎉 Complete demo data seeded successfully!");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });