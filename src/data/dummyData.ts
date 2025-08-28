import { Meeting } from '../types';

export const dummyMeetings: Meeting[] = [
  {
    id: '1',
    title: 'Pertemuan Rutin Klub Catur',
    date: '2025-01-20',
    time: '14:00',
    location: 'Aula Sekolah Menengah Jakarta',
    description: 'Pertemuan rutin mingguan untuk latihan dan diskusi strategi catur. Cocok untuk pemain dari berbagai level.',
    hasMatches: false,
    attendees: [
      {
        id: 'a1',
        name: 'Ahmad Rizki',
        isPresent: true,
        checkedInAt: '13:55'
      },
      {
        id: 'a2',
        name: 'Siti Nurhaliza',
        isPresent: true,
        checkedInAt: '14:02'
      },
      {
        id: 'a3',
        name: 'Budi Santoso',
        isPresent: false
      },
      {
        id: 'a4',
        name: 'Maya Sari',
        isPresent: true,
        checkedInAt: '14:10'
      },
      {
        id: 'a5',
        name: 'Doni Pratama',
        isPresent: false
      },
      {
        id: 'a6',
        name: 'Lisa Indira',
        isPresent: true,
        checkedInAt: '13:58'
      }
    ],
    matches: []
  },
  {
    id: '2',
    title: 'Turnamen Catur Pemuda Jakarta',
    date: '2025-01-25',
    time: '09:00',
    location: 'Gedung Serbaguna Pemuda Jakarta',
    description: 'Turnamen catur tingkat kota untuk kategori pemuda. Sistem Swiss dengan 7 ronde. Hadiah menarik untuk juara.',
    hasMatches: true,
    attendees: [
      {
        id: 'b1',
        name: 'Andi Setiawan',
        isPresent: true,
        checkedInAt: '08:45'
      },
      {
        id: 'b2',
        name: 'Rina Melati',
        isPresent: true,
        checkedInAt: '08:50'
      },
      {
        id: 'b3',
        name: 'Fajar Rahman',
        isPresent: true,
        checkedInAt: '08:55'
      },
      {
        id: 'b4',
        name: 'Diana Putri',
        isPresent: true,
        checkedInAt: '09:05'
      },
      {
        id: 'b5',
        name: 'Rudi Hermawan',
        isPresent: false
      },
      {
        id: 'b6',
        name: 'Indah Lestari',
        isPresent: true,
        checkedInAt: '08:40'
      },
      {
        id: 'b7',
        name: 'Tommy Kurniawan',
        isPresent: true,
        checkedInAt: '09:00'
      },
      {
        id: 'b8',
        name: 'Sari Wulandari',
        isPresent: true,
        checkedInAt: '08:52'
      }
    ],
    matches: [
      {
        id: 'm1',
        matchNumber: 1,
        participant1: 'Andi Setiawan',
        result1: 'menang',
        participant2: 'Fajar Rahman',
        result2: 'kalah'
      },
      {
        id: 'm2',
        matchNumber: 2,
        participant1: 'Rina Melati',
        result1: 'seri',
        participant2: 'Diana Putri',
        result2: 'seri'
      },
      {
        id: 'm3',
        matchNumber: 3,
        participant1: 'Indah Lestari',
        result1: 'menang',
        participant2: 'Tommy Kurniawan',
        result2: 'kalah'
      },
      {
        id: 'm4',
        matchNumber: 4,
        participant1: 'Sari Wulandari',
        result1: 'kalah',
        participant2: 'Andi Setiawan',
        result2: 'menang'
      }
    ]
  }
];