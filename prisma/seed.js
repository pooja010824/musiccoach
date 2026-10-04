const prisma = require("../server/prisma");

async function seedCoach({
  name,
  email,
  phone,
  instrument,
  bio,
  experienceYears,
  hourlyRate,
  availability,
  studentName,
  studentEmail,
  studentPhone,
  age,
  skillLevel,
  learningGoal,
  bookingDate,
  dayOfWeek,
  startTime,
  amount,
  transactionId,
  lessonNotes,
  lessonHomework,
  progressSummary,
  strengths,
  improvements,
  reviewComment,
}) {
  // Instrument
  const instrumentRecord = await prisma.instrument.upsert({
    where: { name: instrument },
    update: {},
    create: { name: instrument },
  });

  // Coach user
  const coachUser = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      phone,
      role: "COACH",
    },
    create: {
      name,
      email,
      phone,
      role: "COACH",
    },
  });

  // Coach profile
  const coach = await prisma.coachProfile.upsert({
    where: { userId: coachUser.id },
    update: {
      bio,
      experienceYears,
      hourlyRate,
      isVerified: true,
      backgroundCheck: true,
    },
    create: {
      userId: coachUser.id,
      bio,
      experienceYears,
      hourlyRate,
      isVerified: true,
      backgroundCheck: true,
    },
  });

  // Coach instrument
  await prisma.coachInstrument.upsert({
    where: {
      coachId_instrumentId: {
        coachId: coach.id,
        instrumentId: instrumentRecord.id,
      },
    },
    update: {},
    create: {
      coachId: coach.id,
      instrumentId: instrumentRecord.id,
    },
  });

  // Availability
  await prisma.availability.deleteMany({
    where: { coachId: coach.id },
  });

  await prisma.availability.createMany({
    data: availability.map((slot) => ({
      coachId: coach.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
    })),
  });

  // Student
  const studentUser = await prisma.user.upsert({
    where: { email: studentEmail },
    update: {
      name: studentName,
      phone: studentPhone,
      role: "STUDENT",
    },
    create: {
      name: studentName,
      email: studentEmail,
      phone: studentPhone,
      role: "STUDENT",
    },
  });

  const student = await prisma.studentProfile.upsert({
    where: { userId: studentUser.id },
    update: {
      age,
      skillLevel,
      learningGoal,
    },
    create: {
      userId: studentUser.id,
      age,
      skillLevel,
      learningGoal,
    },
  });

  // Booking
  let booking = await prisma.booking.findFirst({
    where: {
      studentId: student.id,
      coachId: coach.id,
      instrumentId: instrumentRecord.id,
    },
  });

  const startDate = new Date(bookingDate);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  if (!booking) {
    booking = await prisma.booking.create({
      data: {
        studentId: student.id,
        coachId: coach.id,
        instrumentId: instrumentRecord.id,
        status: "COMPLETED",
        dayOfWeek,
        startTime,
        durationMins: 60,
        startDate,
        endDate,
      },
    });
  } else {
    booking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "COMPLETED",
        dayOfWeek,
        startTime,
        durationMins: 60,
        startDate,
        endDate,
      },
    });
  }

  // Lesson
  let lesson = await prisma.lesson.findFirst({
    where: { bookingId: booking.id },
  });

  if (!lesson) {
    lesson = await prisma.lesson.create({
      data: {
        bookingId: booking.id,
        date: startDate,
        status: "COMPLETED",
        notes: lessonNotes,
        homework: lessonHomework,
      },
    });
  } else {
    lesson = await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        date: startDate,
        status: "COMPLETED",
        notes: lessonNotes,
        homework: lessonHomework,
      },
    });
  }

  // Progress note
  const existingProgress = await prisma.progressNote.findFirst({
    where: { lessonId: lesson.id },
  });

  const progressData = {
    summary: progressSummary,
    strengths,
    improvements,
    homework: lessonHomework,
  };

  if (!existingProgress) {
    await prisma.progressNote.create({
      data: {
        lessonId: lesson.id,
        ...progressData,
      },
    });
  } else {
    await prisma.progressNote.update({
      where: { id: existingProgress.id },
      data: progressData,
    });
  }

  // Payment
  const existingPayment = await prisma.payment.findFirst({
    where: { bookingId: booking.id },
  });

  const paymentData = {
    amount,
    status: "PAID",
    paymentDate: new Date(),
    transactionId,
  };

  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        ...paymentData,
      },
    });
  } else {
    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: paymentData,
    });
  }

  // Review
  const existingReview = await prisma.review.findFirst({
    where: { bookingId: booking.id },
  });

  const reviewData = {
    rating: 5,
    comment: reviewComment,
  };

  if (!existingReview) {
    await prisma.review.create({
      data: {
        bookingId: booking.id,
        studentId: student.id,
        coachId: coach.id,
        ...reviewData,
      },
    });
  } else {
    await prisma.review.update({
      where: { id: existingReview.id },
      data: reviewData,
    });
  }

  console.log(`${instrument} demo data seeded successfully 🎵`);
}

async function main() {
  // Instruments
  await prisma.instrument.upsert({
    where: { name: "Piano" },
    update: {},
    create: { name: "Piano" },
  });

  await prisma.instrument.upsert({
    where: { name: "Violin" },
    update: {},
    create: { name: "Violin" },
  });

  await prisma.instrument.upsert({
    where: { name: "Vocal" },
    update: {},
    create: { name: "Vocal" },
  });

  // --------------------------------------------------
  // RAHUL - PIANO
  // --------------------------------------------------
  await seedCoach({
    name: "Rahul Sharma",
    email: "rahul.coach@example.com",
    phone: "9876543210",
    instrument: "Piano",
    bio: "Experienced piano coach for beginners and intermediate students.",
    experienceYears: 5,
    hourlyRate: 500,

    availability: [
      { dayOfWeek: 1, startTime: "17:00", endTime: "19:00" },
      { dayOfWeek: 3, startTime: "17:00", endTime: "19:00" },
      { dayOfWeek: 6, startTime: "10:00", endTime: "13:00" },
    ],

    studentName: "Aarav Kumar",
    studentEmail: "student@example.com",
    studentPhone: "9876543211",
    age: 14,
    skillLevel: "Beginner",
    learningGoal: "Learn piano from basics",

    bookingDate: "2026-10-05T11:30:00.000Z",
    dayOfWeek: 1,
    startTime: "17:00",
    amount: 500,
    transactionId: "TXN-DEMO-001",

    lessonNotes: "First trial piano lesson",
    lessonHomework: "Practice C major scale for 10 minutes",

    progressSummary:
      "Student learned basic piano posture and C major scale.",
    strengths:
      "Good rhythm and quick understanding of notes.",
    improvements:
      "Needs more practice with finger positioning.",

    reviewComment:
      "Rahul is a great piano coach. Clear explanations and very patient.",
  });

  // --------------------------------------------------
  // PRIYA - VIOLIN
  // --------------------------------------------------
  await seedCoach({
    name: "Priya Mehta",
    email: "priya.violin@example.com",
    phone: "9876543212",
    instrument: "Violin",
    bio: "Classically trained violin coach helping students build strong technique and musical confidence.",
    experienceYears: 7,
    hourlyRate: 600,

    availability: [
      { dayOfWeek: 2, startTime: "18:00", endTime: "20:00" },
      { dayOfWeek: 4, startTime: "17:00", endTime: "20:00" },
      { dayOfWeek: 6, startTime: "10:00", endTime: "13:00" },
    ],

    studentName: "Meera Singh",
    studentEmail: "meera.student@example.com",
    studentPhone: "9876543213",
    age: 16,
    skillLevel: "Beginner",
    learningGoal: "Learn violin technique and improve confidence",

    bookingDate: "2026-10-02T12:30:00.000Z",
    dayOfWeek: 5,
    startTime: "18:00",
    amount: 600,
    transactionId: "TXN-DEMO-002",

    lessonNotes: "Introduction to violin posture, bow grip and open strings.",
    lessonHomework: "Practice bowing open strings for 10 minutes daily.",

    progressSummary:
      "Student learned correct violin posture and basic bow control.",
    strengths:
      "Good listening skills and strong interest in learning.",
    improvements:
      "Needs more consistency with bow direction and finger placement.",

    reviewComment:
      "Priya explains violin techniques very clearly and makes learning enjoyable.",
  });

  // --------------------------------------------------
  // ANANYA - VOCAL
  // --------------------------------------------------
  await seedCoach({
    name: "Ananya Verma",
    email: "ananya.vocal@example.com",
    phone: "9876543214",
    instrument: "Vocal",
    bio: "Professional vocal coach focused on voice technique, confidence, breathing and performance skills.",
    experienceYears: 6,
    hourlyRate: 550,

    availability: [
      { dayOfWeek: 3, startTime: "17:00", endTime: "20:00" },
      { dayOfWeek: 5, startTime: "17:00", endTime: "20:00" },
      { dayOfWeek: 0, startTime: "10:00", endTime: "13:00" },
    ],

    studentName: "Riya Sharma",
    studentEmail: "riya.student@example.com",
    studentPhone: "9876543215",
    age: 15,
    skillLevel: "Beginner",
    learningGoal: "Improve singing technique and stage confidence",

    bookingDate: "2026-10-03T11:30:00.000Z",
    dayOfWeek: 6,
    startTime: "17:00",
    amount: 550,
    transactionId: "TXN-DEMO-003",

    lessonNotes:
      "Introduction to breathing technique, warm-ups and basic vocal exercises.",
    lessonHomework:
      "Practice breathing exercises and vocal warm-ups for 10 minutes daily.",

    progressSummary:
      "Student learned basic breathing technique and vocal warm-up exercises.",
    strengths:
      "Good pitch awareness and enthusiastic participation.",
    improvements:
      "Needs more control over breathing and sustained notes.",

    reviewComment:
      "Ananya is patient and explains vocal exercises in a very simple way.",
  });

  console.log("🎉 Complete demo data for Piano, Violin and Vocal seeded successfully!");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });