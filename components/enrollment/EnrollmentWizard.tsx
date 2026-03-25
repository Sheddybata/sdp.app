"use client";

import type React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { enrollmentSchema, type EnrollmentFormData } from "@/lib/enrollment-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Step1Identity } from "./Step1Identity";
import { Step2Contact } from "./Step2Contact";
import { Step3Geography } from "./Step3Geography";
import { Step4Verification } from "./Step4Verification";
import { Step5Preview } from "./Step5Preview";
import type { EnrollmentSource } from "@/app/actions/enrollment";
import { format, startOfMonth } from "date-fns";

interface EnrollmentWizardProps {
  step: number;
  setStep: (n: number) => void;
  formData: Partial<EnrollmentFormData>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<EnrollmentFormData>>>;
  /** When set, Step 5 shows portal copy for agent/cluster. */
  portalContext?: "agent" | "cluster";
  /** Drives server-side registered_via / registered_by on submit. */
  enrollmentSource?: EnrollmentSource;
}

export function EnrollmentWizard({
  step,
  setStep,
  formData,
  setFormData,
  portalContext,
  enrollmentSource = "public",
}: EnrollmentWizardProps) {
  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      title: formData.title ?? "Mr",
      surname: formData.surname ?? "",
      firstName: formData.firstName ?? "",
      otherNames: formData.otherNames ?? "",
      nin: formData.nin ?? "",
      phone: formData.phone ?? "",
      phoneVerified: formData.phoneVerified ?? false,
      email: formData.email ?? "",
      dateOfBirth: formData.dateOfBirth ?? "",
      address: formData.address ?? "",
      state: formData.state ?? "",
      lga: formData.lga ?? "",
      ward: formData.ward ?? "",
      pollingUnit: formData.pollingUnit ?? "",
      voterRegistrationNumber: formData.voterRegistrationNumber ?? "",
      joinDate: formData.joinDate ?? format(startOfMonth(new Date()), "yyyy-MM-dd"),
      portraitDataUrl: formData.portraitDataUrl ?? "",
      agreedToConstitution: formData.agreedToConstitution ?? false,
      pwdIdentifies: formData.pwdIdentifies,
      pwdCategory: formData.pwdCategory,
      pwdCategoryOther: formData.pwdCategoryOther ?? "",
    },
    mode: "onChange",
  });

  const onNext = () => {
    const values = form.getValues();
    setFormData((prev) => ({ ...prev, ...values }));
    setStep(Math.min(5, step + 1));
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  const onBack = () => {
    setStep(Math.max(1, step - 1));
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  // Validate only the current step's fields so Continue can proceed
  const stepFields: (keyof EnrollmentFormData)[][] = [
    ["title", "surname", "firstName", "otherNames", "nin"],
    ["phone", "phoneVerified", "email", "dateOfBirth", "address"],
    ["joinDate", "state", "lga", "ward", "pollingUnit"],
    [
      "voterRegistrationNumber",
      "portraitDataUrl",
      "agreedToConstitution",
      "pwdIdentifies",
      "pwdCategory",
      "pwdCategoryOther",
    ],
  ];

  const handleStepSubmit = async () => {
    const fields = stepFields[step - 1];
    const ok = fields ? await form.trigger(fields) : true;
    if (ok) onNext();
  };

  if (step === 1) {
    return (
      <Step1Identity
        form={form}
        onNext={handleStepSubmit}
        formData={formData}
        setFormData={setFormData}
      />
    );
  }
  if (step === 2) {
    return (
      <Step2Contact
        form={form}
        onNext={handleStepSubmit}
        onBack={onBack}
        formData={formData}
        setFormData={setFormData}
      />
    );
  }
  if (step === 3) {
    return (
      <Step3Geography
        form={form}
        onNext={handleStepSubmit}
        onBack={onBack}
        formData={formData}
        setFormData={setFormData}
      />
    );
  }
  if (step === 4) {
    return (
      <Step4Verification
        form={form}
        onNext={handleStepSubmit}
        onBack={onBack}
        formData={formData}
        setFormData={setFormData}
        enrollmentSource={enrollmentSource}
      />
    );
  }
  const onBackToEnrollment = () => {
    form.reset({
      title: "Mr",
      surname: "",
      firstName: "",
      otherNames: "",
      nin: "",
      phone: "",
      phoneVerified: false,
      email: "",
      dateOfBirth: "",
      address: "",
      state: "",
      lga: "",
      ward: "",
      pollingUnit: "",
      voterRegistrationNumber: "",
      joinDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      portraitDataUrl: "",
      agreedToConstitution: false,
    });
    setFormData({});
    setStep(1);
  };

  return (
    <Step5Preview
      formData={{ ...formData, ...form.getValues() } as EnrollmentFormData}
      onBack={onBack}
      onBackToEnrollment={onBackToEnrollment}
      portalContext={portalContext}
    />
  );
}
