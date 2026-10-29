import { PartialType } from '@nestjs/swagger';
import { CreateDonationDto } from './create-donation.dto';

// Status is intentionally not part of this DTO — a donor can never set their
// own donation's status directly. Status changes only happen through the
// dedicated moderation/cancel endpoints, which apply backend business rules.
export class UpdateDonationDto extends PartialType(CreateDonationDto) {}
