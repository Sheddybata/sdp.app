"use client";

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

interface EnrollmentWizardProps {
  step: number;
  setStep: (n: number) => void;
  formData: Partial<EnrollmentFormData>;
  setFormData: (d: Partial<EnrollmentFormData>) => void;
}

export function EnrollmentWizard({
  step,
  setStep,
  formData,
  setFormData,
}: EnrollmentWizardProps) {
  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      title: formData.title ?? "Mr",
      surname: formData.surname ?? "",
      firstName: formData.firstName ?? "",
      otherNames: formData.otherNames ?? "",
      phone: formData.phone ?? "",
      email: formData.email ?? "",
      dateOfBirth: formData.dateOfBirth ?? "",
      state: formData.state ?? "",
      lga: formData.lga ?? "",
      ward: formData.ward ?? "",
      voterRegistrationNumber: formData.voterRegistrationNumber ?? "",
      joinDate: formData.joinDate ?? new Date().toISOString().slice(0, 10),
      portraitDataUrl: formData.portraitDataUrl ?? "",
      agreedToConstitution: formData.agreedToConstitution ?? false,
    },
    mode: "onChange",
  });

  const onNext = () => {
    const values = form.getValues();
    setFormData(values);
    setStep(Math.min(5, step + 1));
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  const onBack = () => {
    setStep(Math.max(1, step - 1));
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  // Validate only the current step's fields so Continue can proceed
  const stepFields: (keyof EnrollmentFormData)[][] = [
    ["title", "surname", "firstName", "otherNames"],
    ["phone", "email", "dateOfBirth"],
    ["joinDate", "state", "lga", "ward"],
    ["voterRegistrationNumber", "portraitDataUrl", "agreedToConstitution"],
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
      />
    );
  }
  const onBackToEnrollment = () => {
    form.reset({
      title: "Mr",
      surname: "",
      firstName: "",
      otherNames: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      state: "",
      lga: "",
      ward: "",
      voterRegistrationNumber: "",
      joinDate: new Date().toISOString().slice(0, 10),
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
    />
  );
}
